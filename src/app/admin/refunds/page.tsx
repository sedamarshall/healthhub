import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { kes } from "@/lib/utils";
import { setRefundStatus } from "../actions-more";
import { Actions, Check, DataTable, ExportLink, IconAction, ModuleHeader, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

export const metadata = { title: "Return & Refund" };
const PER = 10;

export default async function RefundsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : 0;
  const where: Prisma.RefundWhereInput = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(since ? { createdAt: { gte: new Date(Date.now() - since * 86400000) } } : {}),
    ...(sp.q ? { OR: [{ reason: { contains: sp.q } }, { order: { number: { contains: sp.q } } }, { order: { email: { contains: sp.q } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: true } }),
  ]);
  const tone = (s: string) => (s === "refunded" ? "success" : s === "rejected" ? "danger" : s === "approved" ? "info" : "warning") as "success";

  return (
    <div>
      <ModuleHeader title="Return & Refund">
        <ExportLink href="/admin/export/refunds" />
      </ModuleHeader>
      <Toolbar
        action="/admin/refunds"
        params={sp}
        filters={[
          { name: "status", label: "Status", options: ["requested", "approved", "refunded", "rejected"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) },
          { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Order Number", "Amount", "Order Date", "Mail", "Reason", "Status", "Date", "Action"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="w-10"><Check label="Select refund" /></td>
            <td className="!text-[#495057]">{shortId(r.id)}</td>
            <td><Link href={`/admin/orders/${r.orderId}`} className="hover:text-[#a10fe4]">{r.order.number}</Link></td>
            <td className="whitespace-nowrap font-semibold">{kes(r.amount)}</td>
            <td className="whitespace-nowrap">{fmtDate(r.order.createdAt)}</td>
            <td className="max-w-[180px] truncate">{r.order.email}</td>
            <td className="max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
            <td><Badge tone={tone(r.status)}>{r.status}</Badge></td>
            <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
            <td>
              <Actions>
                {r.status === "requested" && <IconAction action={setRefundStatus} kind="approve" label="Approve refund" fields={{ id: r.id, status: "approved" }} />}
                {(r.status === "requested" || r.status === "approved") && (
                  <IconAction action={setRefundStatus} kind="approve" label="Mark as refunded (money sent)" fields={{ id: r.id, status: "refunded" }} confirm={`Confirm ${kes(r.amount)} has been sent back to the customer?`} />
                )}
                {r.status !== "refunded" && r.status !== "rejected" && <IconAction action={setRefundStatus} kind="reject" label="Reject refund" fields={{ id: r.id, status: "rejected" }} confirm="Reject this refund request?" />}
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/refunds" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
