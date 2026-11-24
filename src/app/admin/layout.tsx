import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logout } from "@/app/actions/auth";
import { AdminShell } from "./ui/AdminShell";


export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Health Hub Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  const me = await prisma.user.findUnique({ where: { id: s.uid }, select: { notificationsSeenAt: true, avatar: true } });
  const since = me?.notificationsSeenAt ?? new Date(Date.now() - 7 * 864e5);
  const [pendingRx, toFulfil, toReview, newMessages, newOrders] = await Promise.all([
    prisma.order.count({ where: { rxStatus: "pending" } }),
    prisma.order.count({ where: { status: { in: ["paid", "processing"] } } }),
    prisma.product.count({ where: { needsReview: true } }),
    prisma.message.count({ where: { status: "new" } }),
    prisma.order.count({ where: { createdAt: { gt: since } } }),
  ]);

  return (
    <div>
      <AdminShell user={{ name: s.name, email: s.email, role: s.role, avatar: me?.avatar ?? null }} counts={{ pendingRx, toFulfil, toReview, newMessages, newOrders }} logoutAction={logout}>
        {children}
      </AdminShell>
    </div>
  );
}
