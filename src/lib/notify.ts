import "server-only";
import { after } from "next/server";
import { prisma } from "./db";
import { sendAccountEmail, sendOrderEmail, sendStaffEmail, type OrderEmailKind } from "./mail";

/** Run work after the response is sent (emails never slow down or break a request). */
function later(run: () => Promise<unknown>) {
  const safe = () => run().catch((e) => console.error("[notify]", e instanceof Error ? e.message : e));
  try {
    after(safe);
  } catch {
    void safe(); // outside a request (scripts, webhooks run directly)
  }
}

/**
 * Order emails. The customer gets the email for `kind`; the store email also gets an alert for new
 * orders and for payments.
 */
export function notifyOrder(orderId: number, kind: OrderEmailKind, extra?: { note?: string; amount?: number }) {
  later(async () => {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) return;
    await sendOrderEmail(kind, o, extra);
    if (kind === "placed" || kind === "rx_pending") await sendStaffEmail("new_order", o);
    if (kind === "paid") await sendStaffEmail("payment_received", o);
  });
}

export function notifyWelcome(user: { name: string; email: string }) {
  later(() => sendAccountEmail("welcome", user.email, { name: user.name }));
}

export function notifyContact(d: { name: string; email: string; phone?: string | null; subject?: string | null; body: string; storeEmail: string }) {
  later(async () => {
    await sendAccountEmail("contact_staff", d.storeEmail, { name: d.name, email: d.email, phone: d.phone ?? undefined, subject: d.subject ?? undefined, body: d.body });
    await sendAccountEmail("contact_ack", d.email, { name: d.name, body: d.body });
  });
}
