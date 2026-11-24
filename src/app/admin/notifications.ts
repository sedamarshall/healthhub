"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export type OrderNote = {
  id: number;
  number: string;
  name: string;
  total: number;
  status: string;
  paid: boolean;
  createdAt: string; // ISO
  unread: boolean;
};

/** First-time staff see the last 7 days as "new" instead of every order ever placed. */
const FIRST_LOOK_DAYS = 7;

async function seenAt(uid: number): Promise<Date> {
  const u = await prisma.user.findUnique({ where: { id: uid }, select: { notificationsSeenAt: true } });
  return u?.notificationsSeenAt ?? new Date(Date.now() - FIRST_LOOK_DAYS * 864e5);
}

/** Latest orders for the bell dropdown, plus how many are new. */
export async function getOrderNotifications(): Promise<{ unread: number; items: OrderNote[] }> {
  const me = await requireStaff();
  const since = await seenAt(me.uid);
  const [unread, orders] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gt: since } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, number: true, name: true, total: true, status: true, paymentStatus: true, createdAt: true },
    }),
  ]);
  return {
    unread,
    items: orders.map((o) => ({
      id: o.id,
      number: o.number,
      name: o.name,
      total: o.total,
      status: o.status,
      paid: o.paymentStatus === "paid",
      createdAt: o.createdAt.toISOString(),
      unread: o.createdAt > since,
    })),
  };
}

/** Mark everything up to now as read for this staff member. */
export async function markOrderNotificationsRead(): Promise<void> {
  const me = await requireStaff();
  await prisma.user.update({ where: { id: me.uid }, data: { notificationsSeenAt: new Date() } });
}
