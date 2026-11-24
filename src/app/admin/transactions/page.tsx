import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { kes } from "@/lib/utils";
import { Check, DataTable, ExportLink, ModuleHeader, Toolbar, fmtDate } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

export const metadata = { title: "Transactions" };
const PER = 10;

function Method({ provider }: { provider: string }) {
  if (provider === "ipay") return <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#a10fe4] text-[8px] font-black text-white">iPay</span>iPay</span>;
  return provider === "mpesa" ? (
    <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4caf50] text-[9px] font-black text-white">M</span>M-Pesa</span>
  ) : (
    <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1a1f71] text-[9px] font-black text-white">VISA</span>Card</span>
  );
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : 0;
  const where: Prisma.PaymentWhereInput = {
    ...(sp.payment ? { status: sp.payment } : {}),
    ...(sp.method ? { provider: sp.method } : {}),
    ...(since ? { createdAt: { gte: new Date(Date.now() - since * 86400000) } } : {}),
    ...(sp.q ? { OR: [{ reference: { contains: sp.q } }, { receipt: { contains: sp.q } }, { order: { number: { contains: sp.q } } }, { order: { email: { contains: sp.q } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: true } }),
  ]);

  return (
    <div>
      <ModuleHeader title="Orders Transactions">
        <ExportLink href="/admin/export/transactions" />
      </ModuleHeader>
      <Toolbar
        action="/admin/transactions"
        params={sp}
        placeholder="Order no., receipt, email..."
        filters={[
          { name: "payment", label: "Payment status", options: [{ value: "paid", label: "Paid" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }] },
          { name: "method", label: "Method", options: [{ value: "ipay", label: "iPay" }, { value: "mpesa", label: "M-Pesa (old)" }, { value: "paystack", label: "Card (old)" }] },
          { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "Tracking Number", "Product Price", "Delivery Fee", "Method", "Receipt", "Email", "Status", "Date"]} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="w-10"><Check label="Select transaction" /></td>
            <td className="!text-[#495057]"><Link href={`/admin/orders/${p.orderId}`} className="hover:text-[#a10fe4]">#{p.order.number}</Link></td>
            <td className="whitespace-nowrap">{kes(p.order.subtotal - p.order.discount)}</td>
            <td className="whitespace-nowrap">{kes(p.order.deliveryFee)}</td>
            <td className="whitespace-nowrap"><Method provider={p.provider} /></td>
            <td className="max-w-[140px] truncate text-xs" title={p.message ?? ""}>{p.receipt ?? "-"}</td>
            <td className="max-w-[180px] truncate">{p.order.email}</td>
            <td><Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "warning"}>{p.status === "paid" ? "Paid" : p.status === "failed" ? "Failed" : "Pending"}</Badge></td>
            <td className="whitespace-nowrap">{fmtDate(p.createdAt)}</td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/transactions" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
