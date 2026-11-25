import "server-only";
import { prisma } from "./db";

export type CouponResult = { ok: true; code: string; discount: number; title: string } | { ok: false; message: string };

/** Validate a coupon code against a cart subtotal and work out the discount (KES). */
export async function evaluateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a coupon code" };
  const c = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (!c || !c.isActive) return { ok: false, message: "That coupon code isn't valid" };
  if (c.startsAt && now < c.startsAt) return { ok: false, message: "This coupon isn't active yet" };
  if (c.endsAt && now > c.endsAt) return { ok: false, message: "This coupon has expired" };
  if (c.usageLimit !== null) {
    // "used" only counts paid orders; also count recent orders still waiting for payment, so a limited
    // coupon can't be used by many people at once before any of them pay.
    const waiting = await prisma.order.count({ where: { couponCode: c.code, paymentStatus: { not: "paid" }, status: { in: ["awaiting_rx", "pending_payment"] }, createdAt: { gte: new Date(Date.now() - 48 * 3_600_000) } } });
    if (c.used + waiting >= c.usageLimit) return { ok: false, message: "This coupon has been fully used" };
  }
  if (subtotal < c.minOrder) return { ok: false, message: `Spend at least KES ${c.minOrder.toLocaleString()} to use this coupon` };
  let discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true, code: c.code, discount, title: c.title };
}

export function couponStatus(c: { isActive: boolean; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null; used: number }) {
  const now = new Date();
  if (!c.isActive) return "Inactive";
  if (c.endsAt && now > c.endsAt) return "Expired";
  if (c.usageLimit !== null && c.used >= c.usageLimit) return "Used up";
  if (c.startsAt && now < c.startsAt) return "Scheduled";
  return "Active";
}
