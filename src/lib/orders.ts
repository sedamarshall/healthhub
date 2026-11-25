import "server-only";
import { prisma } from "./db";
import { notifyOrder } from "./notify";

/**
 * Mark a payment (and its order) as paid. Idempotent: callbacks can arrive more than once.
 * Stock is deducted here, in the same transaction.
 */
export async function markPaymentPaid(reference: string, info: { receipt?: string | null; amount?: number | null; message?: string; raw?: unknown }) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { reference }, include: { order: { include: { items: true } } } });
    if (!payment) return { ok: false, reason: "unknown payment" };
    if (payment.status === "paid") return { ok: true, already: true };
    if (info.amount != null && info.amount < payment.amount) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "failed", message: `Amount mismatch: got ${info.amount}`, raw: JSON.stringify(info.raw ?? null) } });
      return { ok: false, reason: "amount mismatch" };
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "paid", receipt: info.receipt ?? null, message: info.message ?? null, raw: JSON.stringify(info.raw ?? null) },
    });
    const order = payment.order;
    if (order.paymentStatus === "paid") return { ok: true, already: true };
    // A paid order goes straight to Processing (ready to be packed).
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "paid", status: "processing", paidAt: new Date() } });
    if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { used: { increment: 1 } } });
    const short: string[] = [];
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      // Two customers can pay for the last unit at the same time: the payment still counts, but flag the order.
      if (product.stockStatus === "in_stock" && product.stockQty < item.qty) short.push(`${product.name} (needed ${item.qty}, had ${product.stockQty})`);
      const newQty = Math.max(0, product.stockQty - item.qty);
      await tx.product.update({
        where: { id: product.id },
        data: { stockQty: newQty, ...(product.stockStatus === "in_stock" && newQty === 0 ? { stockStatus: "out_of_stock" } : {}) },
      });
      await tx.stockMovement.create({ data: { productId: product.id, delta: -item.qty, reason: "sale", orderId: order.id } });
    }
    if (short.length) {
      const note = `⚠ Not enough stock when paid: ${short.join("; ")}. Restock or contact the customer.`;
      await tx.order.update({ where: { id: order.id }, data: { notes: order.notes ? `${order.notes}
${note}` : note } });
    }
    return { ok: true, orderId: order.id };
  });
  if ("orderId" in result && result.orderId) notifyOrder(result.orderId, "paid");
  return result;
}

export async function markPaymentFailed(reference: string, message: string, raw?: unknown) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment || payment.status !== "pending") return;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", message, raw: JSON.stringify(raw ?? null) } });
  const changed = await prisma.order.updateMany({ where: { id: payment.orderId, paymentStatus: "pending" }, data: { paymentStatus: "failed" } });
  if (changed.count) notifyOrder(payment.orderId, "payment_failed", { note: message });
}

/** Put stock back when a paid order is cancelled. */
export async function restockOrder(orderId: number, userEmail: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.paymentStatus !== "paid") return;
  for (const item of order.items) {
    if (!item.productId) continue;
    await prisma.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.qty } } });
    await prisma.stockMovement.create({ data: { productId: item.productId, delta: item.qty, reason: "cancel", orderId, userEmail } });
  }
}

export function canPayOrder(o: { status: string; paymentStatus: string; rxStatus: string }) {
  return o.status === "pending_payment" && o.paymentStatus !== "paid" && (o.rxStatus === "not_required" || o.rxStatus === "approved");
}
