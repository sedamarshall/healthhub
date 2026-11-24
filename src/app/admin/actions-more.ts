"use server";

import bcrypt from "bcryptjs";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff, setSession } from "@/lib/auth";
import { notifyOrder } from "@/lib/notify";
import { renderAny, sendRendered, verifySmtp } from "@/lib/mail";
import { saveSettings, SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";
import { sanitizeHtml } from "@/lib/sanitize";
import { normalizeKenyanPhone, slugify } from "@/lib/utils";
import { deleteUploaded, saveProductImage } from "@/lib/uploads";
import { refreshRating } from "@/lib/reviews";

export type FormState = { error?: string; ok?: string };
const err = (e: unknown) => ({ error: e instanceof Error ? e.message : "Something went wrong" });

// ---------------- Tags ----------------
export async function saveTag(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const id = Number(f.get("id")) || null;
  const name = String(f.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Tag name is required" };
  const clash = await prisma.tag.findFirst({ where: { name, NOT: id ? { id } : undefined } });
  if (clash) return { error: "A tag with that name already exists" };
  if (id) await prisma.tag.update({ where: { id }, data: { name, slug: slugify(name) } });
  else await prisma.tag.create({ data: { name, slug: slugify(name) } });
  redirect("/admin/tags");
}
export async function deleteTag(f: FormData) {
  await requireStaff(["admin"]);
  await prisma.tag.delete({ where: { id: Number(f.get("id")) } });
  revalidatePath("/admin/tags");
}

// ---------------- Brands ----------------
export async function saveBrand(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const id = Number(f.get("id")) || null;
  const name = String(f.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Brand name is required" };
  const clash = await prisma.brand.findFirst({ where: { name, NOT: id ? { id } : undefined } });
  if (clash) return { error: "A brand with that name already exists" };
  let logo: string | undefined;
  const file = f.get("logo");
  if (file instanceof File && file.size > 0) {
    try {
      logo = await saveProductImage(file);
    } catch (e) {
      return err(e);
    }
  }
  if (id) {
    const before = await prisma.brand.findUnique({ where: { id } });
    await prisma.brand.update({ where: { id }, data: { name, slug: slugify(name), ...(logo ? { logo } : {}) } });
    // keep product brand names in step with a rename
    if (before && before.name !== name) await prisma.product.updateMany({ where: { brand: before.name }, data: { brand: name } });
  } else await prisma.brand.create({ data: { name, slug: slugify(name), logo } });
  revalidatePath("/", "layout");
  revalidateTag("catalog");
  redirect("/admin/brands");
}
export async function deleteBrand(f: FormData) {
  await requireStaff(["admin"]);
  const b = await prisma.brand.findUnique({ where: { id: Number(f.get("id")) } });
  if (!b) return;
  await prisma.product.updateMany({ where: { brand: b.name }, data: { brand: null } });
  await prisma.brand.delete({ where: { id: b.id } });
  revalidatePath("/admin/brands");
}

// ---------------- Reviews ----------------
export async function setReviewStatus(f: FormData) {
  await requireStaff(["admin"]);
  const r = await prisma.review.update({ where: { id: Number(f.get("id")) }, data: { status: String(f.get("status")) === "hidden" ? "hidden" : "published" } });
  await refreshRating(r.productId);
  revalidatePath("/admin/products/reviews");
}
export async function deleteReview(f: FormData) {
  await requireStaff(["admin"]);
  const r = await prisma.review.delete({ where: { id: Number(f.get("id")) } });
  await refreshRating(r.productId);
  revalidatePath("/admin/products/reviews");
}

// ---------------- Refunds ----------------
export async function createRefund(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  const orderId = Number(f.get("orderId"));
  const amount = Math.round(Number(f.get("amount")));
  const reason = String(f.get("reason") ?? "").trim();
  const method = String(f.get("method") ?? "mpesa");
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { refunds: true } });
  if (!order) return { error: "Order not found" };
  if (order.paymentStatus !== "paid") return { error: "Only paid orders can be refunded" };
  const already = order.refunds.filter((r) => r.status !== "rejected").reduce((a, r) => a + r.amount, 0);
  if (!amount || amount <= 0 || amount + already > order.total) return { error: `Refund must be between 1 and ${order.total - already}` };
  if (reason.length < 3) return { error: "Give a reason for the refund" };
  await prisma.refund.create({ data: { orderId, amount, reason, method, createdBy: s.email } });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: "Refund request recorded. Approve it in Return & Refund once the money is sent." };
}
export async function setRefundStatus(f: FormData) {
  const s = await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  const status = String(f.get("status"));
  if (!["approved", "refunded", "rejected"].includes(status)) return;
  const reference = String(f.get("reference") ?? "").trim() || undefined;
  const before = await prisma.refund.findUnique({ where: { id } });
  const r = await prisma.refund.update({ where: { id }, data: { status, ...(reference ? { reference } : {}), note: `${status} by ${s.email}` } });
  if (status === "refunded" && before?.status !== "refunded") notifyOrder(r.orderId, "refunded", { amount: r.amount, note: r.reference ?? undefined });
  revalidatePath("/admin/refunds");
}

// ---------------- Users ----------------
const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  role: z.enum(["customer", "pharmacist", "admin"]),
  password: z.string().max(200).optional(),
});
export async function saveUser(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaff(["admin"]);
  const id = Number(f.get("id")) || null;
  const parsed = userSchema.safeParse(Object.fromEntries(f.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const phone = d.phone ? normalizeKenyanPhone(d.phone) : null;
  if (d.phone && !phone) return { error: "Enter a valid Kenyan phone number" };
  const clash = await prisma.user.findFirst({ where: { email: d.email, NOT: id ? { id } : undefined } });
  if (clash) return { error: "Another account uses that email" };
  if (!id && (!d.password || d.password.length < 8)) return { error: "Set a password of at least 8 characters" };
  if (d.password && d.password.length > 0 && d.password.length < 8) return { error: "Password must be at least 8 characters" };
  const isActive = f.get("isActive") === "on";
  const data = {
    name: d.name,
    email: d.email,
    phone,
    role: id === me.uid ? me.role : d.role,
    isActive: id === me.uid ? true : isActive,
    ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
  };
  if (id) await prisma.user.update({ where: { id }, data });
  else await prisma.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  const back = String(f.get("back") || "/admin/users");
  redirect(back.startsWith("/admin") ? back : "/admin/users");
}
export async function toggleUserActive(f: FormData) {
  const me = await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  if (id === me.uid) return;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  revalidatePath("/admin", "layout");
  revalidateTag("catalog");
}
export async function deleteCustomer(f: FormData) {
  await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  const u = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!u || u.role !== "customer") return;
  // keep accounts that have orders (order history), just deactivate them
  if (u._count.orders > 0) await prisma.user.update({ where: { id }, data: { isActive: false } });
  else await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/customers");
}

// ---------------- Coupons ----------------
export async function saveCoupon(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const id = Number(f.get("id")) || null;
  const code = String(f.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const title = String(f.get("title") ?? "").trim();
  const type = String(f.get("type")) === "fixed" ? "fixed" : "percent";
  const value = Math.round(Number(f.get("value")));
  const minOrder = Math.max(0, Math.round(Number(f.get("minOrder")) || 0));
  const maxDiscount = Number(f.get("maxDiscount")) || null;
  const usageLimit = Number(f.get("usageLimit")) || null;
  const startsAt = f.get("startsAt") ? new Date(String(f.get("startsAt"))) : null;
  const endsAt = f.get("endsAt") ? new Date(String(f.get("endsAt"))) : null;
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return { error: "Code must be 3–20 letters/numbers" };
  if (title.length < 2) return { error: "Give the coupon a title" };
  if (!value || value <= 0 || (type === "percent" && value > 90)) return { error: type === "percent" ? "Percentage must be 1–90" : "Amount must be above 0" };
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "End date must be after the start date" };
  const clash = await prisma.coupon.findFirst({ where: { code, NOT: id ? { id } : undefined } });
  if (clash) return { error: "That code is already used by another coupon" };
  const data = { code, title, type, value, minOrder, maxDiscount, usageLimit, startsAt, endsAt, isActive: f.get("isActive") === "on" };
  if (id) await prisma.coupon.update({ where: { id }, data });
  else await prisma.coupon.create({ data });
  redirect("/admin/coupons");
}
export async function deleteCoupon(f: FormData) {
  await requireStaff(["admin"]);
  await prisma.coupon.delete({ where: { id: Number(f.get("id")) } });
  revalidatePath("/admin/coupons");
}

// ---------------- Flash sales ----------------
/** A flash sale sets a time-boxed sale price on each chosen product. */
export async function saveFlashSale(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const id = Number(f.get("id")) || null;
  const title = String(f.get("title") ?? "").trim();
  const discountPct = Math.round(Number(f.get("discountPct")));
  const startsAt = new Date(String(f.get("startsAt")));
  const endsAt = new Date(String(f.get("endsAt")));
  const skus = String(f.get("skus") ?? "").split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (title.length < 2) return { error: "Give the flash sale a title" };
  if (!discountPct || discountPct < 1 || discountPct > 90) return { error: "Discount must be 1–90%" };
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) return { error: "Set a start and an end time (end after start)" };
  const products = await prisma.product.findMany({ where: { sku: { in: skus } } });
  const missing = skus.filter((s) => !products.some((p) => p.sku === s));
  if (!products.length) return { error: "Add at least one product SKU" };
  if (missing.length) return { error: `Unknown SKU(s): ${missing.join(", ")}` };
  const isActive = f.get("isActive") === "on";
  const sale = id
    ? await prisma.flashSale.update({ where: { id }, data: { title, discountPct, startsAt, endsAt, isActive } })
    : await prisma.flashSale.create({ data: { title, discountPct, startsAt, endsAt, isActive } });
  // clear products removed from this sale
  await prisma.product.updateMany({ where: { flashSaleId: sale.id, id: { notIn: products.map((p) => p.id) } }, data: { flashSaleId: null, salePrice: null, saleStartsAt: null, saleEndsAt: null } });
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: isActive
        ? { flashSaleId: sale.id, salePrice: Math.max(1, Math.round(p.price * (1 - discountPct / 100))), saleStartsAt: startsAt, saleEndsAt: endsAt }
        : { flashSaleId: sale.id, salePrice: null, saleStartsAt: null, saleEndsAt: null },
    });
  }
  revalidatePath("/", "layout");
  revalidateTag("catalog");
  redirect("/admin/flash-sales");
}
export async function deleteFlashSale(f: FormData) {
  await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  await prisma.product.updateMany({ where: { flashSaleId: id }, data: { flashSaleId: null, salePrice: null, saleStartsAt: null, saleEndsAt: null } });
  await prisma.flashSale.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidateTag("catalog");
}

// ---------------- Content pages (FAQ, privacy, terms) ----------------
export async function savePage(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const id = Number(f.get("id")) || null;
  const kind = String(f.get("kind"));
  if (!["faq", "privacy", "terms", "about"].includes(kind)) return { error: "Unknown page type" };
  const title = String(f.get("title") ?? "").trim();
  const content = sanitizeHtml(String(f.get("content") ?? ""));
  if (title.length < 2 || content.length < 2) return { error: kind === "faq" ? "Enter a question and an answer" : "Enter a title and details" };
  const data = { kind, title, content, position: Number(f.get("position")) || 0, status: String(f.get("status")) === "draft" ? "draft" : "published" };
  if (id) await prisma.page.update({ where: { id }, data });
  else await prisma.page.create({ data });
  revalidatePath("/", "layout");
  revalidateTag("catalog");
  redirect(`/admin/content/${kind}`);
}
export async function deletePage(f: FormData) {
  await requireStaff(["admin"]);
  const p = await prisma.page.delete({ where: { id: Number(f.get("id")) } });
  revalidatePath(`/admin/content/${p.kind}`);
}

// ---------------- Settings ----------------
export async function saveSettingsForm(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const keys = String(f.get("_keys") ?? "").split(",").filter((k): k is SettingKey => k in SETTING_DEFAULTS);
  const toggles = String(f.get("_toggles") ?? "").split(",").filter((k): k is SettingKey => k in SETTING_DEFAULTS);
  const values: Partial<Record<SettingKey, string>> = {};
  for (const k of keys) values[k] = String(f.get(k) ?? "").trim();
  for (const k of toggles) values[k] = f.get(k) === "on" ? "1" : "0";
  for (const k of ["freeDeliveryOver"] as SettingKey[]) {
    if (k in values && !/^\d+$/.test(values[k]!)) return { error: "Fees and thresholds must be whole numbers (KES)" };
  }
  if ("freeDeliveryOver" in values) revalidateTag("shipping");
  await saveSettings(values);
  revalidatePath("/", "layout");
  revalidateTag("catalog");
  return { ok: "Settings saved" };
}

export async function changeMyPassword(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaff();
  const current = String(f.get("oldPassword") ?? "");
  const next = String(f.get("newPassword") ?? "");
  const confirm = String(f.get("confirmPassword") ?? "");
  if (!current && !next && !confirm) return {};
  const user = await prisma.user.findUnique({ where: { id: me.uid } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Your current password is wrong" };
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  if (next !== confirm) return { error: "New passwords don't match" };
  await prisma.user.update({ where: { id: me.uid }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Password changed" };
}

/** The signed-in staff member edits their own name, email and phone (Profile page). */
export async function saveMyProfile(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaff();
  const name = String(f.get("name") ?? "").trim();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const phoneIn = String(f.get("phone") ?? "").trim();
  if (name.length < 2) return { error: "Enter your name" };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address" };
  const phone = phoneIn ? normalizeKenyanPhone(phoneIn) : null;
  if (phoneIn && !phone) return { error: "Enter a valid phone number, e.g. 0712 345 678" };
  if (await prisma.user.findFirst({ where: { email, NOT: { id: me.uid } } })) return { error: "Another account already uses that email" };
  const before = await prisma.user.findUnique({ where: { id: me.uid }, select: { avatar: true } });
  let avatar: string | null | undefined;
  const file = f.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return { error: "Profile picture must be under 2 MB" };
    try {
      avatar = await saveProductImage(file);
    } catch (e) {
      return err(e);
    }
  } else if (f.get("removeAvatar") === "1") avatar = null;
  await prisma.user.update({ where: { id: me.uid }, data: { name, email, phone, ...(avatar !== undefined ? { avatar } : {}) } });
  if (avatar !== undefined && before?.avatar) await deleteUploaded(before.avatar);
  await setSession({ ...me, name, email }); // header shows the new name straight away
  revalidatePath("/admin", "layout");
  return { ok: "Profile saved" };
}

// ---------------- Abandoned carts ----------------
export async function deleteCart(f: FormData) {
  await requireStaff(["admin"]);
  await prisma.cart.delete({ where: { id: String(f.get("id")) } });
  revalidatePath("/admin/abandoned-carts");
}

// ---------------- Shipping methods ----------------
const shippingSchema = z.object({
  group: z.string().trim().min(1, "Enter a group heading, e.g. Flat Rate").max(60),
  title: z.string().trim().min(1, "Enter the method name, e.g. Flat Shipping Rate").max(80),
  note: z.string().trim().max(120).default(""),
  fee: z.string().trim().regex(/^\d+$/, "Fee must be a whole number in KES (0 for free)"),
  position: z.string().trim().regex(/^\d*$/, "Sort order must be a number").default(""),
});

function shippingChanged() {
  revalidateTag("shipping");
  revalidatePath("/admin/settings/shipping");
}

export async function saveShippingMethod(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const parsed = shippingSchema.safeParse(Object.fromEntries(f.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const id = Number(f.get("id") || 0);
  const data = {
    group: d.group,
    title: d.title,
    note: d.note,
    fee: Number(d.fee),
    freeOver: f.get("freeOver") === "on",
    needsAddress: f.get("needsAddress") === "on",
    isActive: f.get("isActive") === "on",
    position: d.position ? Number(d.position) : ((await prisma.shippingMethod.aggregate({ _max: { position: true } }))._max.position ?? 0) + 1,
  };
  if (id) await prisma.shippingMethod.update({ where: { id }, data });
  else await prisma.shippingMethod.create({ data });
  shippingChanged();
  if (id) redirect("/admin/settings/shipping");
  return { ok: `Added "${d.title}"` };
}

export async function deleteShippingMethod(f: FormData) {
  await requireStaff(["admin"]);
  await prisma.shippingMethod.delete({ where: { id: Number(f.get("id")) } });
  shippingChanged();
}

export async function toggleShippingMethod(f: FormData) {
  await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  const m = await prisma.shippingMethod.findUnique({ where: { id } });
  if (m) await prisma.shippingMethod.update({ where: { id }, data: { isActive: !m.isActive } });
  shippingChanged();
}

/** Move a method up or down in the checkout list. */
export async function moveShippingMethod(f: FormData) {
  await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  const dir = f.get("dir") === "up" ? -1 : 1;
  const all = await prisma.shippingMethod.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] });
  const i = all.findIndex((m) => m.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((m, k) => prisma.shippingMethod.update({ where: { id: m.id }, data: { position: k + 1 } })));
  shippingChanged();
}

// ---------------- Home Page Control (banners) ----------------
const blockSchema = z.object({
  name: z.string().trim().min(2, "Enter a block name").max(80),
  type: z.enum(["hero", "promo"], { message: "Choose a type" }),
  slug: z.string().trim().max(80).default(""),
  tag: z.string().trim().max(60).default(""),
  badge: z.string().trim().max(30).default(""),
  title: z.string().trim().min(2, "Enter a title").max(120),
  text: z.string().trim().max(240).default(""),
  ctaLabel: z.string().trim().max(30).default("Shop Now"),
  href: z.string().trim().max(200).refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Link must start with / (a page on this site) or https://").default("/search"),
  bgColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Background colour must look like #ffe9d6").default("#ffe9d6"),
  position: z.string().trim().regex(/^\d*$/, "Order must be a number").default(""),
});

function homeChanged() {
  revalidateTag("catalog");
  revalidateTag("home-blocks");
  revalidatePath("/");
  revalidatePath("/admin/home-page");
}
const toDate = (v: FormDataEntryValue | null) => (typeof v === "string" && v ? new Date(v) : null);

export async function saveHomeBlock(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const parsed = blockSchema.safeParse(Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const id = Number(f.get("id")) || null;
  const slug = slugify(d.slug || d.name);
  if (await prisma.homeBlock.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) return { error: "Another block already uses that slug" };
  const startsAt = toDate(f.get("startsAt"));
  const endsAt = toDate(f.get("endsAt"));
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "End date must be after the start date" };

  let image: string | undefined;
  const file = f.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      image = await saveProductImage(file);
    } catch (e) {
      return err(e);
    }
  }
  const before = id ? await prisma.homeBlock.findUnique({ where: { id } }) : null;
  const data = {
    name: d.name, slug, type: d.type, tag: d.tag, badge: d.badge, title: d.title, text: d.text,
    ctaLabel: d.ctaLabel || "Shop Now", href: d.href || "/search", bgColor: d.bgColor, startsAt, endsAt,
    isActive: f.get("isActive") !== "off",
    position: d.position ? Number(d.position) : before?.position ?? ((await prisma.homeBlock.aggregate({ _max: { position: true } }))._max.position ?? 0) + 1,
    ...(image ? { image } : f.get("removeImage") === "1" ? { image: null } : {}),
  };
  if (id) {
    await prisma.homeBlock.update({ where: { id }, data });
    if (before?.image && (image || f.get("removeImage") === "1")) await deleteUploaded(before.image);
  } else await prisma.homeBlock.create({ data });
  homeChanged();
  redirect("/admin/home-page");
}

export async function deleteHomeBlock(f: FormData) {
  await requireStaff(["admin"]);
  const b = await prisma.homeBlock.delete({ where: { id: Number(f.get("id")) } }).catch(() => null);
  if (b?.image) await deleteUploaded(b.image);
  homeChanged();
}

export async function toggleHomeBlock(f: FormData) {
  await requireStaff(["admin"]);
  const id = Number(f.get("id"));
  const b = await prisma.homeBlock.findUnique({ where: { id } });
  if (b) await prisma.homeBlock.update({ where: { id }, data: { isActive: !b.isActive } });
  homeChanged();
}

// ---------------- Email (SMTP test + template test sends) ----------------
export async function testSmtpConnection(_p: FormState, _f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const r = await verifySmtp();
  return r.ok ? { ok: r.message } : { error: r.message };
}

export async function sendTestEmail(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const to = String(f.get("to") ?? "").trim();
  const key = String(f.get("template") ?? "placed");
  if (!z.string().email().safeParse(to).success) return { error: "Enter a valid email address to send the test to" };
  const r = await renderAny(key);
  if (!r) return { error: "Unknown template" };
  const sent = await sendRendered(to, { ...r, subject: `[TEST] ${r.subject}` });
  if (sent.skipped) return { error: "SMTP isn't set up yet, so nothing was sent. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM to .env and restart the site." };
  return sent.ok ? { ok: `Test email sent to ${to}. Check the inbox (and spam folder).` } : { error: `Sending failed: ${sent.error}` };
}
