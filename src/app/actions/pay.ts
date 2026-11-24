"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canPayOrder } from "@/lib/orders";
import { IPAY, checkoutFields, ipayConfigured, ipaySimulated } from "@/lib/ipay";

async function loadPayableOrder(number: string, token: string) {
  const order = await prisma.order.findUnique({ where: { number } });
  if (!order) return null;
  const session = await getSession();
  const allowed = order.accessToken === token || (session && session.uid === order.userId);
  return allowed ? order : null;
}

export type IpayStart =
  | { ok: true; action: string; method: "POST" | "GET"; fields: Record<string, string> }
  | { ok: false; message: string };

/** Start an iPay payment: records a pending payment and returns the signed form to post to iPay. */
export async function payWithIpay(number: string, token: string): Promise<IpayStart> {
  const order = await loadPayableOrder(number, token);
  if (!order) return { ok: false, message: "Order not found" };
  if (!canPayOrder(order)) return { ok: false, message: "This order can't be paid right now." };
  if (!ipayConfigured() && !ipaySimulated()) return { ok: false, message: "Online payment isn't set up yet. Please call us to pay." };

  const reference = `${order.number}-${randomBytes(3).toString("hex").toUpperCase()}`;
  await prisma.payment.create({ data: { orderId: order.id, provider: "ipay", amount: order.total, reference, phone: order.phone } });
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "pending" } });

  if (ipaySimulated()) return { ok: true, action: "/pay/simulate-ipay", method: "GET", fields: { ref: reference, amount: String(order.total) } };
  return { ok: true, action: IPAY.checkoutUrl, method: "POST", fields: checkoutFields({ orderNumber: order.number, reference, amount: order.total, phone: order.phone, email: order.email }) };
}
