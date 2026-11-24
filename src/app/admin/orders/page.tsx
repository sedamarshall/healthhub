import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { kes } from "@/lib/utils";
import { Check, DataTable, ExportLink, IconLink, ModuleHeader, Tile, Toolbar, fmtDate } from "../ui/kit";
import { AdminPagination, LineChart, OrderBadge, PayOutline } from "../ui/widgets";
import { IBan, ICart, IPackage, IRefund, IRx, ITransaction, ITruck } from "../ui/icons";

export const metadata = { title: "Orders" };
const PER = 10;
const DAY = 86_400_000;

type Period = "12m" | "30d" | "7d" | "24h";

/** Earnings (paid order totals) vs refunds, bucketed for the chosen period. */
async function profitSeries(period: Period) {
  const now = new Date();
  let buckets: { label: string; from: Date; to: Date }[];
  if (period === "12m") {
    buckets = Array.from({ length: 12 }, (_, i) => {
      const from = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { label: from.toLocaleString("en", { month: "short" }), from, to: new Date(from.getFullYear(), from.getMonth() + 1, 1) };
    });
  } else if (period === "24h") {
    buckets = Array.from({ length: 12 }, (_, i) => {
      const from = new Date(now.getTime() - (24 - i * 2) * 3600_000);
      return { label: `${String(from.getHours()).padStart(2, "0")}:00`, from, to: new Date(from.getTime() + 2 * 3600_000) };
    });
  } else {
    const days = period === "30d" ? 30 : 7;
    const step = period === "30d" ? 3 : 1;
    buckets = Array.from({ length: days / step }, (_, i) => {
      const from = new Date(now.getTime() - (days - i * step) * DAY);
      from.setHours(0, 0, 0, 0);
      return { label: from.toLocaleDateString("en", { day: "numeric", month: "short" }), from, to: new Date(from.getTime() + step * DAY) };
    });
  }
  const start = buckets[0].from;
  const [paid, refunds] = await Promise.all([
    prisma.order.findMany({ where: { paidAt: { gte: start } }, select: { total: true, paidAt: true } }),
    prisma.refund.findMany({ where: { status: "refunded", updatedAt: { gte: start } }, select: { amount: true, updatedAt: true } }),
  ]);
  return {
    labels: buckets.map((b) => b.label),
    earnings: buckets.map((b) => paid.filter((o) => o.paidAt! >= b.from && o.paidAt! < b.to).reduce((a, o) => a + o.total, 0)),
    refunds: buckets.map((b) => refunds.filter((r) => r.updatedAt >= b.from && r.updatedAt < b.to).reduce((a, r) => a + r.amount, 0)),
  };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const period = (["12m", "30d", "7d", "24h"].includes(sp.period ?? "") ? sp.period : "12m") as Period;
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : sp.date === "365" ? 365 : 0;
  const where: Prisma.OrderWhereInput = {
    ...(sp.status ? { status: sp.status === "processing" ? { in: ["processing", "paid"] } : sp.status } : {}),
    ...(sp.payment ? { paymentStatus: sp.payment } : {}),
    ...(since ? { createdAt: { gte: new Date(Date.now() - since * DAY) } } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q.replace(/^#/, "") } }, { name: { contains: sp.q } }, { phone: { contains: sp.q.replace(/^0/, "") } }, { email: { contains: sp.q } }] } : {}),
  };
  const [total, orders, groups, refunded, failed, chart] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } }, items: { select: { qty: true } } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.refund.count({ where: { status: { in: ["approved", "refunded"] } } }),
    prisma.order.count({ where: { paymentStatus: "failed" } }),
    profitSeries(period),
  ]);
  const count = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0;
  const all = groups.reduce((a, g) => a + g._count._all, 0);
  const periodLink = (p: Period) => {
    const q = new URLSearchParams(Object.entries({ ...sp, period: p === "12m" ? undefined : p, page: undefined }).filter(([, v]) => v) as [string, string][]);
    return `/admin/orders${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <div>
      <ModuleHeader title="Total Orders">
        <ExportLink href={`/admin/export/orders${sp.status ? `?status=${sp.status}` : ""}`} />
      </ModuleHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Total Order" value={all} bg="rgba(146,189,245,0.6)" icon={<IPackage />} />
        <Tile label="Pending Payment" value={count("pending_payment") + count("awaiting_rx")} bg="rgba(255,235,105,0.6)" icon={<ITransaction className="h-6 w-6" />} />
        <Tile label="Processing" value={count("paid") + count("processing")} bg="rgba(160,226,224,0.6)" icon={<ICart className="h-6 w-6" />} />
        <Tile label="Shipped" value={count("shipped")} bg="rgba(255,192,145,0.6)" icon={<ITruck />} />
        <Tile label="Delivered" value={count("delivered")} bg="rgba(255,214,239,0.6)" icon={<IPackage />} />
        <Tile label="Cancel" value={count("cancelled")} bg="rgba(255,174,64,0.5)" icon={<IBan className="h-6 w-6" />} />
        <Tile label="Returned" value={refunded} bg="rgba(158,232,114,0.6)" icon={<IRefund />} />
        <Tile label="Failed" value={failed} bg="rgba(116,202,255,0.45)" icon={<IRx className="h-6 w-6" />} />
      </div>

      <div className="mt-6">
        <Toolbar
          action="/admin/orders"
          params={sp}
          filters={[
            { name: "payment", label: "Payment status", options: [{ value: "paid", label: "Paid" }, { value: "pending", label: "Pending" }, { value: "unpaid", label: "Unpaid" }, { value: "failed", label: "Failed" }] },
            { name: "status", label: "Received status", options: Object.entries({ awaiting_rx: "Awaiting Rx", pending_payment: "Awaiting payment", processing: "Processing (paid)", shipped: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" }).map(([value, label]) => ({ value, label })) },
            { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "365", label: "Last 12 months" }] },
          ]}
          placeholder="Order no., name, phone..."
        />
        <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Customer", "Items", "Amount", "Payment status", "Received status", "Date", "Action"]} empty={!orders.length}>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="w-10"><Check label={`Select order ${o.number}`} /></td>
              <td className="!text-[#495057]"><Link href={`/admin/orders/${o.id}`} className="hover:text-[#a10fe4]">#{o.number}</Link></td>
              <td className="whitespace-nowrap">{o.name}</td>
              <td className="whitespace-nowrap">{o.items.reduce((a, i) => a + i.qty, 0)} pcs</td>
              <td className="whitespace-nowrap">{kes(o.total)}</td>
              <td><PayOutline status={o.paymentStatus} /></td>
              <td><OrderBadge status={o.status} /></td>
              <td className="whitespace-nowrap">{fmtDate(o.createdAt)}</td>
              <td><IconLink href={`/admin/orders/${o.id}`} kind="view" label="View order" /></td>
            </tr>
          ))}
        </DataTable>
        <AdminPagination base="/admin/orders" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
      </div>

      {/* Orders come first; the earnings chart sits below the list */}
      <div className="mt-10 border-t border-[rgba(145,158,171,0.2)] pt-6">
        <h4 className="mb-3 text-lg font-bold text-[#212529]">Profit margin</h4>
        <div className="mb-2 inline-flex rounded-xl border border-[rgba(145,158,171,0.2)] p-1 text-sm">
          {(
            [
              ["12m", "12 months"],
              ["30d", "30 days"],
              ["7d", "7 days"],
              ["24h", "24 hours"],
            ] as [Period, string][]
          ).map(([k, l]) => (
            <Link key={k} href={periodLink(k)} scroll={false} className={`rounded-lg px-4 py-1.5 ${period === k ? "bg-white font-semibold text-[#212529] shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-[#637381]"}`}>{l}</Link>
          ))}
        </div>
        <LineChart labels={chart.labels} series={[{ name: "Earnings", color: "#a10fe4", values: chart.earnings }, { name: "Refunds", color: "#ffab00", values: chart.refunds }]} />
      </div>

    </div>
  );
}
