"use server";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { COUPON_COOKIE, getCart, getCartCoupon, linkCartToUser } from "@/lib/cart";
import { getSession, hashPassword, setSession } from "@/lib/auth";
import { sniffType } from "@/lib/uploads";
import { offerToLinkGuestOrders } from "@/lib/link-orders";
import { allow, clientIp } from "@/lib/ratelimit";
import { getSettings, paymentMethods } from "@/lib/settings";
import { evaluateCoupon } from "@/lib/coupons";
import { getShippingOptions, shippingFee } from "@/lib/shipping";
import { canPurchase, normalizeKenyanPhone } from "@/lib/utils";
import { notifyOrder, notifyWelcome } from "@/lib/notify";

/** `step` tells the multi-step form which step to reopen for the error. */
export type CheckoutState = { error?: string; step?: number; fields?: Record<string, string> };

// Same information the old healthhub.ke (OpenCart) checkout collected.
const opt = (max: number) => z.string().trim().max(max).default("");
const schema = z.object({
  account: z.enum(["guest", "register", "member"]).default("guest"),
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim(),
  company: opt(80),
  address1: z.string().trim().min(1, "Enter your address").max(200),
  address2: opt(120),
  city: z.string().trim().min(1, "Enter your city or town").max(80),
  postcode: opt(10),
  county: z.string().trim().min(1, "Choose your county").max(60),
  password: opt(200),
  confirm: opt(200),
  shipDifferent: z.string().default("0"),
  shipFirstName: opt(60),
  shipLastName: opt(60),
  shipCompany: opt(80),
  shipAddress1: opt(200),
  shipAddress2: opt(120),
  shipCity: opt(80),
  shipPostcode: opt(10),
  shipCounty: opt(60),
  zone: z.string().min(1, "Choose a delivery method"),
  notes: opt(500),
  payMethod: z.enum(["ipay"]).optional(),
  agree: z.string().optional(),
});

/** Which checkout step a field lives on (so an error reopens that step). */
const STEP_OF: Record<string, number> = {
  firstName: 2, lastName: 2, email: 2, phone: 2, company: 2, address1: 2, address2: 2, city: 2, postcode: 2, county: 2, password: 2, confirm: 2,
  shipFirstName: 3, shipLastName: 3, shipCompany: 3, shipAddress1: 3, shipAddress2: 3, shipCity: 3, shipPostcode: 3, shipCounty: 3,
  zone: 4, notes: 4, payMethod: 5, agree: 5,
};

const RX_TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const RX_MAX_BYTES = 8 * 1024 * 1024;

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `HH${ymd}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, step: STEP_OF[String(issue.path[0])] ?? 6, fields };
  }
  const d = parsed.data;
  const s = await getSettings();
  const zone = (await getShippingOptions()).find((z) => z.id === d.zone);
  if (!zone) return { error: "Choose a delivery method", step: 4, fields };
  const pickup = !zone.needsAddress;
  const phone = normalizeKenyanPhone(d.phone);
  if (!phone) return { error: "Enter a valid Safaricom/Airtel number, e.g. 0712 345 678", step: 2, fields };
  const ship = d.shipDifferent === "1";
  if (ship && !pickup && (!d.shipFirstName || !d.shipLastName || !d.shipAddress1 || !d.shipCity || !d.shipCounty)) {
    return { error: "Complete the delivery address, or tick \"same as billing address\"", step: 3, fields };
  }
  if (d.agree !== "1") return { error: "Please agree to the Terms & Conditions", step: 5, fields };

  let session = await getSession();
  const wantsAccount = !session && d.account === "register";
  if (wantsAccount) {
    if (d.password.length < 8) return { error: "Password must be at least 8 characters", step: 2, fields };
    if (d.password !== d.confirm) return { error: "Passwords don't match", step: 2, fields };
    if (await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } })) {
      return { error: "An account with this email already exists. Log in in Step 1, or choose Guest Checkout.", step: 1, fields };
    }
    if (!(await allow(`register:${await clientIp()}`, 5, 60 * 60_000))) return { error: "Too many sign-ups from this connection. Please choose Guest Checkout.", step: 1, fields };
  }

  const cart = await getCart();
  if (!cart.id || !cart.items.length) return { error: "Your cart is empty", fields };
  // Stops scripted order floods (each order emails the store and may store an 8 MB prescription).
  const ip = await clientIp();
  if (!(await allow(`order:${ip}`, 10, 60 * 60_000)) || !(await allow(`order:cart:${cart.id}`, 5, 60 * 60_000))) {
    return { error: "Too many orders in a short time. Please wait a little, or call us to order.", fields };
  }
  const bad = cart.items.find((i) => !canPurchase(i.product) || (i.product.stockStatus === "in_stock" && i.qty > i.product.stockQty));
  if (bad) return { error: `"${bad.product.name}" is no longer available in that quantity. Please update your cart.`, fields };

  const methods = await paymentMethods();
  const payMethod = "ipay";
  if (d.payMethod && !methods.ipay) return { error: "That payment method isn't available right now", step: 5, fields };

  // Coupon (validated again here; the cookie is only a hint)
  const code = await getCartCoupon();
  let discount = 0;
  let couponCode: string | null = null;
  if (code) {
    const r = await evaluateCoupon(code, cart.subtotal);
    if (!r.ok) return { error: `Coupon: ${r.message}. Remove it in your cart to continue.`, fields };
    discount = r.discount;
    couponCode = r.code;
  }

  // Prescription upload (required when the cart has prescription-only medicine)
  let rxFile: { path: string; name: string; type: string } | null = null;
  if (cart.hasRx) {
    const file = form.get("prescription");
    if (!(file instanceof File) || file.size === 0) return { error: "Please upload your prescription (photo or PDF)", step: 5, fields };
    if (file.size > RX_MAX_BYTES) return { error: "Prescription file must be under 8 MB", step: 5, fields };
    const buf = Buffer.from(await file.arrayBuffer());
    const real = sniffType(buf); // check the actual bytes, not the type the browser claims
    if (!real || !RX_TYPES[real]) return { error: "Prescription must be a PDF, JPG, PNG or WEBP file", step: 5, fields };
    const dir = join(process.cwd(), "storage", "prescriptions");
    await mkdir(dir, { recursive: true });
    const stored = `${Date.now()}-${randomBytes(8).toString("hex")}.${RX_TYPES[real]}`;
    await writeFile(join(dir, stored), buf);
    rxFile = { path: stored, name: file.name.slice(0, 120), type: real };
  }

  if (wantsAccount) {
    const user = await prisma.user.create({
      data: {
        name: `${d.firstName} ${d.lastName}`.trim(),
        email: d.email.toLowerCase(),
        phone,
        passwordHash: await hashPassword(d.password),
        county: d.county, town: d.city, street: d.address1, apartment: d.address2 || null,
      },
    });
    notifyWelcome(user);
    offerToLinkGuestOrders(user); // earlier guest orders join the account only after the email is confirmed
    await setSession({ uid: user.id, role: "customer", name: user.name, email: user.email });
    await linkCartToUser(user.id);
    session = { uid: user.id, role: "customer", name: user.name, email: user.email };
  }

  const afterDiscount = cart.subtotal - discount;
  const fee = shippingFee(zone, afterDiscount, Number(s.freeDeliveryOver));
  const accessToken = randomBytes(16).toString("hex");
  // Delivery address: the billing address unless "deliver to a different address" was chosen.
  const to = ship
    ? { name: `${d.shipFirstName} ${d.shipLastName}`.trim(), company: d.shipCompany, a1: d.shipAddress1, a2: d.shipAddress2, city: d.shipCity, postcode: d.shipPostcode, county: d.shipCounty }
    : { name: "", company: d.company, a1: d.address1, a2: d.address2, city: d.city, postcode: d.postcode, county: d.county };
  const street = [to.name && `Deliver to: ${to.name}`, to.company, to.a1, to.a2].filter(Boolean).join(", ");

  let number = orderNumber();
  while (await prisma.order.findUnique({ where: { number } })) number = orderNumber();

  let created;
  try {
  created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        number,
        accessToken,
        userId: session?.uid ?? null,
        name: `${d.firstName} ${d.lastName}`.trim(),
        email: d.email.toLowerCase(),
        phone,
        county: pickup ? "-" : to.county || "-",
        town: pickup ? zone.title : [to.city, to.postcode].filter(Boolean).join(" "),
        address: pickup ? zone.title : street,
        notes: d.notes || null,
        deliveryZone: zone.title,
        subtotal: cart.subtotal,
        discount,
        couponCode,
        deliveryFee: fee,
        total: afterDiscount + fee,
        status: cart.hasRx ? "awaiting_rx" : "pending_payment",
        rxStatus: cart.hasRx ? "pending" : "not_required",
        items: {
          create: cart.items.map((i) => ({ productId: i.product.id, name: i.product.name, sku: i.product.sku, price: i.unitPrice, qty: i.qty, rxClass: i.product.rxClass })),
        },
      },
    });
    if (rxFile) {
      await tx.prescription.create({ data: { orderId: order.id, userId: session?.uid ?? null, filePath: rxFile.path, originalName: rxFile.name, mimeType: rxFile.type } });
    }
    await tx.cartItem.deleteMany({ where: { cartId: cart.id! } });
    return order;
  });
  } catch (e) {
    // Don't leave an orphaned prescription file behind if the order couldn't be saved.
    if (rxFile) await unlink(join(process.cwd(), "storage", "prescriptions", rxFile.path)).catch(() => {});
    throw e;
  }
  notifyOrder(created.id, cart.hasRx ? "rx_pending" : "placed");
  if (session && !wantsAccount) {
    // remember the billing address for next time
    await prisma.user.update({ where: { id: session.uid }, data: { county: d.county, town: d.city, street: d.address1, apartment: d.address2 || null } });
  }
  (await cookies()).delete(COUPON_COOKIE);

  redirect(`/order/${number}?t=${accessToken}&pay=${payMethod}`);
}
