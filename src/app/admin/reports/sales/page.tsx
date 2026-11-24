import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { kes } from "@/lib/utils";
import { Check, DataTable, ExportLink, IconLink, ModuleHeader, ThumbCell, Tile, Toolbar, fmtDate } from "../../ui/kit";
import { AdminPagination, LineChart, OrderBadge } from "../../ui/widgets";
import { ICart, IPackage, IRefund, ITransaction } from "../../ui/icons";

export const metadata = { title: "Sales reports" };
const PER = 10;

export default async function SalesReports({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const days = sp.date === "7" ? 7 : sp.date === "30" ? 30 : sp.date === "90" ? 90 : 365;
  const from = new Date(Date.now() - days * 86400000);
  const paidWhere: Prisma.OrderWhereInput = { paymentStatus: "paid", paidAt: { gte: from } };
  const tableWhere: Prisma.OrderWhereInput = {
    ...paidWhere,
    ...(sp.status ? { status: sp.status === "processing" ? { in: ["processing", "paid"] } : sp.status } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { number: { contains: sp.q } }] } : {}),
  };

  const yearAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1);
  const [agg, refunds, rows, tableTotal, chartOrders, chartRefunds] = await Promise.all([
    prisma.order.aggregate({ where: paidWhere, _sum: { total: true }, _count: { _all: true } }),
    prisma.refund.aggregate({ where: { status: "refunded", updatedAt: { gte: from } }, _sum: { amount: true } }),
    prisma.order.findMany({ where: tableWhere, orderBy: { paidAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { items: { select: { qty: true } } } }),
    prisma.order.count({ where: tableWhere }),
    prisma.order.findMany({ where: { paymentStatus: "paid", paidAt: { gte: yearAgo } }, select: { total: true, paidAt: true } }),
    prisma.refund.findMany({ where: { status: "refunded", updatedAt: { gte: yearAgo } }, select: { amount: true, updatedAt: true } }),
  ]);
  const sales = agg._sum.total ?? 0;
  const count = agg._count._all;
  const months = Array.from({ length: 12 }, (_, i) => new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i, 1));
  const inMonth = (d: Date, m: Date) => d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  const earning = months.map((m) => chartOrders.filter((o) => inMonth(o.paidAt!, m)).reduce((a, o) => a + o.total, 0));
  const refunded = months.map((m) => chartRefunds.filter((r) => inMonth(r.updatedAt, m)).reduce((a, r) => a + r.amount, 0));
  const thisHalf = earning.slice(6).reduce((a, b) => a + b, 0);
  const lastHalf = earning.slice(0, 6).reduce((a, b) => a + b, 0);
  const growth = lastHalf ? Math.round(((thisHalf - lastHalf) / lastHalf) * 100) : thisHalf ? 100 : 0;

  return (
    <div>
      <ModuleHeader title="Sales reports">
        <ExportLink href={`/admin/export/sales?days=${days}`} />
      </ModuleHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Total Sales" value={kes(sales)} bg="rgba(160,226,224,0.6)" icon={<ITransaction className="h-6 w-6" />} />
        <Tile label="Total Orders" value={count} bg="rgba(158,232,114,0.6)" icon={<ICart className="h-6 w-6" />} />
        <Tile label="Average Order" value={kes(count ? Math.round(sales / count) : 0)} bg="rgba(255,235,105,0.6)" icon={<IPackage />} />
        <Tile label="Refunded" value={kes(refunds._sum.amount ?? 0)} bg="rgba(255,214,239,0.6)" icon={<IRefund />} />
      </div>
      <section className="mt-6 rounded-2xl border border-[rgba(145,158,171,0.2)] p-4 sm:p-6">
        <h4 className="text-lg font-bold text-[#212529]">Revenue</h4>
        <p className="mt-1 text-sm text-[#495057]">({growth >= 0 ? "+" : ""}{growth}%) last 6 months vs the 6 before</p>
        <LineChart labels={months.map((m) => m.toLocaleString("en", { month: "short" }))} series={[{ name: "Earning", color: "#22c55e", values: earning }, { name: "Refunds", color: "#2d6cdf", values: refunded }]} smooth area />
      </section>
      <div className="mt-6">
        <Toolbar
          action="/admin/reports/sales"
          params={sp}
          filters={[
            { name: "status", label: "Status", options: Object.entries({ processing: "Processing", shipped: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" }).map(([value, label]) => ({ value, label })) },
            { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "365", label: "Last 12 months" }] },
          ]}
        />
        <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Customer", "Items", "Amount", "Delivery", "Status", "Date", "Action"]} empty={!rows.length}>
          {rows.map((o) => (
            <tr key={o.id}>
              <td className="w-10"><Check label="Select sale" /></td>
              <td className="!text-[#495057]">#{o.number}</td>
              <td><ThumbCell title={o.name} round /></td>
              <td>{o.items.reduce((a, i) => a + i.qty, 0)}</td>
              <td className="whitespace-nowrap">{kes(o.total)}</td>
              <td className="whitespace-nowrap">{kes(o.deliveryFee)}</td>
              <td><OrderBadge status={o.status} /></td>
              <td className="whitespace-nowrap">{fmtDate(o.paidAt)}</td>
              <td><IconLink href={`/admin/orders/${o.id}`} kind="view" label="View order" /></td>
            </tr>
          ))}
        </DataTable>
        <AdminPagination base="/admin/reports/sales" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(tableTotal / PER)} />
      </div>
    </div>
  );
}
