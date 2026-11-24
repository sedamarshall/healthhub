import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCart, getCartCoupon } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings, paymentMethods } from "@/lib/settings";
import { evaluateCoupon } from "@/lib/coupons";
import { getShippingOptions } from "@/lib/shipping";
import { kes, saleActive } from "@/lib/utils";
import { CheckoutForm } from "@/components/CheckoutForm";
import { CouponForm } from "@/components/CartLine";
import { Breadcrumbs } from "@/components/Listing";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart.items.length) redirect("/cart");
  const [session, s, code, methods, shipping] = await Promise.all([getSession(), getSettings(), getCartCoupon(), paymentMethods(), getShippingOptions()]);
  const user = session ? await prisma.user.findUnique({ where: { id: session.uid } }) : null;
  const coupon = code ? await evaluateCoupon(code, cart.subtotal) : null;
  const [firstName, ...rest] = (user?.name ?? "").split(" ");

  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Cart", href: "/cart" }, { name: "Checkout" }]} />
      <CheckoutForm
        zones={shipping}
        lines={cart.items.map((i) => ({
          id: i.id,
          name: i.product.name,
          qty: i.qty,
          unit: kes(i.unitPrice),
          was: saleActive(i.product) ? kes(i.product.price) : undefined,
          image: i.product.images[0]?.url,
          rx: i.product.rxClass === "pom",
        }))}
        subtotal={cart.subtotal}
        discount={coupon?.ok ? coupon.discount : 0}
        couponCode={coupon?.ok ? coupon.code : undefined}
        freeOver={Number(s.freeDeliveryOver)}
        hasRx={cart.hasRx}
        noPayment={!methods.ipay}
        payMethods={methods}
        defaults={{ firstName: firstName || undefined, lastName: rest.join(" ") || undefined, email: user?.email, phone: user?.phone ? `0${user.phone.slice(3)}` : undefined, county: user?.county ?? undefined, city: user?.town ?? undefined, address1: user?.street ?? undefined, address2: user?.apartment ?? undefined }}
        signedIn={user ? { name: user.name, email: user.email } : null}
        couponSlot={<CouponForm applied={coupon?.ok ? coupon.code : undefined} />}
      />
    </div>
  );
}
