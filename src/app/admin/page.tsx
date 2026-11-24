import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { kes } from "@/lib/utils";
import { updateOrderStatus } from "./actions";
import { ConfirmSubmit } from "./ui/ConfirmSubmit";
import { AdminPagination, Badge, BarChart, OrderBadge, Panel, PieChart, Progress, Sparkline, StatCard, short } from "./ui/widgets";

const DAY = 86_400_000;
const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ op?: string; sp?: string }> }) {
  const sp = await searchParams;
  const now = Date.now();
  const d30 = new Date(now - 30 * DAY), d60 = new Date(now - 60 * DAY), h1 = new Date(now - 3600_000);
  const yearAgo = new Date(new Date().getFullYear() - 1, new Date().getMonth() + 1, 1);
  const twoYearsAgo = new Date(yearAgo.getFullYear() - 1, yearAgo.getMonth(), 1);
  const orderPage = Math.max(1, Number(sp.op) || 1);
  const stockPage = Math.max(1, Number(sp.sp) || 1);
  const lowStockWhere = { status: "active", OR: [{ stockStatus: "in_stock", stockQty: { lte: 3 } }, { stockStatus: "out_of_stock" }] };

  const [
    salesAll, sales30, salesPrev, ordersAll, orders30, ordersPrev, custAll, cust30, custPrev,
    rxPending, rx30, rxPrev, toFulfil, stockProducts, abandoned, failAll, fail30, failPrev,
    statusGroups, paidOrders, paidItems, recentCount, recent, lowCount, lowStock,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: "paid" }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { paidAt: { gte: d30 } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { paidAt: { gte: d60, lt: d30 } }, _sum: { total: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: d30 } } }),
    prisma.order.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.user.count({ where: { role: "customer", createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { role: "customer", createdAt: { gte: d60, lt: d30 } } }),
    prisma.order.count({ where: { rxStatus: "pending" } }),
    prisma.prescription.count({ where: { createdAt: { gte: d30 } } }),
    prisma.prescription.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
    prisma.order.count({ where: { status: { in: ["paid", "processing"] } } }),
    prisma.product.count({ where: { status: "active", stockStatus: { not: "out_of_stock" } } }),
    prisma.cart.count({ where: { updatedAt: { lt: h1 }, items: { some: {} } } }),
    prisma.payment.count({ where: { status: "failed" } }),
    prisma.payment.count({ where: { status: "failed", createdAt: { gte: d30 } } }),
    prisma.payment.count({ where: { status: "failed", createdAt: { gte: d60, lt: d30 } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.findMany({ where: { paidAt: { gte: twoYearsAgo } }, select: { total: true, paidAt: true } }),
    prisma.orderItem.findMany({
      where: { order: { paymentStatus: "paid", paidAt: { gte: new Date(now - 183 * DAY) } } },
      select: { price: true, qty: true, order: { select: { paidAt: true } }, product: { select: { categories: { select: { category: { select: { id: true, name: true, parentId: true } } } } } } },
    }),
    prisma.order.count(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, skip: (orderPage - 1) * 5, take: 5, include: { _count: { select: { items: true } } } }),
    prisma.product.count({ where: lowStockWhere }),
    prisma.product.findMany({
      where: lowStockWhere,
      orderBy: [{ stockQty: "asc" }, { name: "asc" }],
      skip: (stockPage - 1) * 4,
      take: 4,
      include: { images: { take: 1, orderBy: { position: "asc" } }, categories: { take: 1, include: { category: true } } },
    }),
  ]);

  // Order status pie
  const count = (s: string) => statusGroups.find((g) => g.status === s)?._count._all ?? 0;
  const statusData = [
    { label: "Awaiting Rx review", value: count("awaiting_rx"), color: "#826af9" },
    { label: "Awaiting payment", value: count("pending_payment"), color: "#ffef5a" },
    { label: "Processing (paid)", value: count("processing") + count("paid"), color: "#2d99ff" },
    { label: "Out for delivery", value: count("shipped"), color: "#ff6c40" },
    { label: "Delivered", value: count("delivered"), color: "#850cbd" },
    { label: "Cancelled", value: count("cancelled"), color: "#cb0233" },
  ];

  // Monthly revenue (last 12 months) and year-on-year change
  const months = Array.from({ length: 12 }, (_, i) => new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i, 1));
  const revenue = months.map((m) => ({
    label: MONTHS[m.getMonth()],
    value: paidOrders.filter((o) => o.paidAt && o.paidAt.getFullYear() === m.getFullYear() && o.paidAt.getMonth() === m.getMonth()).reduce((a, o) => a + o.total, 0),
  }));
  const thisYear = revenue.reduce((a, r) => a + r.value, 0);
  const lastYear = paidOrders.filter((o) => o.paidAt && o.paidAt < yearAgo).reduce((a, o) => a + o.total, 0);
  const yoy = pct(thisYear, lastYear);

  // Top (top-level) categories by sales over the last 6 months, with monthly sparkline
  const sixMonths = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d; });
  const catSales = new Map<number, { name: string; total: number; monthly: number[] }>();
  for (const it of paidItems) {
    const top = it.product?.categories.map((c) => c.category).find((c) => c.parentId === null);
    if (!top || !it.order.paidAt) continue;
    const entry = catSales.get(top.id) ?? { name: top.name, total: 0, monthly: Array(6).fill(0) };
    const amount = it.price * it.qty;
    entry.total += amount;
    const idx = sixMonths.findIndex((m) => m.getFullYear() === it.order.paidAt!.getFullYear() && m.getMonth() === it.order.paidAt!.getMonth());
    if (idx >= 0) entry.monthly[idx] += amount;
    catSales.set(top.id, entry);
  }
  const topCats = [...catSales.values()].sort((a, b) => b.total - a.total).slice(0, 4);
  const catTotal = [...catSales.values()].reduce((a, c) => a + c.total, 0);

  const fulfilTotal = Math.max(1, ordersAll);
  const fulfil = [
    { label: "Out for delivery", value: count("shipped"), color: "#2d99ff", track: "#d0ebff" },
    { label: "Delivered", value: count("delivered"), color: "#850cbd", track: "#efd6fc" },
    { label: "Pending shipments", value: count("paid") + count("processing"), color: "#ffc727", track: "#fff5cc" },
    { label: "Awaiting Rx review", value: count("awaiting_rx"), color: "#212529", track: "#eceff1" },
    { label: "Cancelled", value: count("cancelled"), color: "#cb0233", track: "#ffd9d6" },
  ];

  const stats = [
    { label: "Total Sales", value: kes(salesAll._sum.total ?? 0), change: pct(sales30._sum.total ?? 0, salesPrev._sum.total ?? 0), bg: "rgba(160,226,224,0.6)", href: "/admin/reports/sales" },
    { label: "Total Orders", value: short(ordersAll), change: pct(orders30, ordersPrev), bg: "rgba(255,235,105,0.6)", href: "/admin/orders" },
    { label: "Total Customers", value: custAll.toLocaleString(), change: pct(cust30, custPrev), bg: "rgba(255,192,145,0.6)", href: "/admin/customers" },
    { label: "Prescriptions to Review", value: rxPending.toLocaleString(), change: pct(rx30, rxPrev), bg: "rgba(255,214,239,0.6)", href: "/admin/prescriptions" },
    { label: "Orders to Fulfil", value: toFulfil.toLocaleString(), bg: "rgba(146,189,245,0.6)", href: "/admin/orders?status=processing" },
    { label: "Stock Products", value: stockProducts.toLocaleString(), bg: "rgba(255,174,64,0.5)", href: "/admin/inventory" },
    { label: "Abandoned Carts", value: abandoned.toLocaleString(), bg: "rgba(158,232,114,0.6)", href: "/admin/abandoned-carts" },
    { label: "Payment Failures", value: failAll.toLocaleString(), change: fail30 || failPrev ? -pct(fail30, failPrev) : undefined, bg: "rgba(116,202,255,0.6)", href: "/admin/transactions?payment=failed" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Order Status">
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:justify-between">
            <ul className="w-full max-w-xs space-y-2">
              {statusData.map((d) => (
                <li key={d.label} className="flex items-center gap-3 text-sm text-[#212529]">
                  <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1">{d.label}</span>
                  <span className="font-num">{d.value}</span>
                </li>
              ))}
            </ul>
            <PieChart data={statusData} />
          </div>
        </Panel>

        <Panel title="Top Categories By Sales" subtitle={`Last 6 months: ${kes(catTotal)}`}>
          <ul className="space-y-6 p-6">
            {topCats.length === 0 && <li className="text-sm text-[#495057]">No paid sales yet.</li>}
            {topCats.map((c, i) => (
              <li key={c.name} className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-9 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: ["#2a9d8f", "#ffc727", "#2d99ff", "#cb0233"][i] }}>{c.name.slice(0, 2).toUpperCase()}</span>
                <span className="flex-1 truncate font-medium text-[#212529]">{c.name}</span>
                <Sparkline values={c.monthly} color={c.monthly[5] >= c.monthly[4] ? "#00c853" : "#ff3d60"} />
                <span className="w-14 text-right font-num font-semibold text-[#212529]">{short(c.total)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Monthly Revenue" subtitle={`(${yoy >= 0 ? "+" : ""}${yoy.toFixed(0)}%) than last year`}>
          <div className="p-6 pt-4"><BarChart data={revenue} /></div>
        </Panel>
        <Panel title="Order Fulfillment Status">
          <div className="space-y-5 p-6">
            {fulfil.map((f) => <Progress key={f.label} {...f} total={fulfilTotal} />)}
          </div>
        </Panel>
      </div>

      <Panel title="Recent Orders" action={<Link href="/admin/orders" className="text-sm font-semibold text-[#a10fe4]">View all</Link>}>
        <div className="mt-4 overflow-x-auto">
          <table className="adm-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Order Date</th><th>Items</th><th>Price</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-medium text-[#212529] hover:text-[#a10fe4]">#{o.number}</Link></td>
                  <td>{o.name}</td>
                  <td className="whitespace-nowrap">{o.createdAt.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>{o._count.items}</td>
                  <td className="whitespace-nowrap">{kes(o.total)}</td>
                  <td><OrderBadge status={o.status} /></td>
                  <td>
                    {["awaiting_rx", "pending_payment", "paid", "processing"].includes(o.status) ? (
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <ConfirmSubmit title={`Cancel order #${o.number}?`} message={o.paymentStatus === "paid" ? "This order is paid. Its stock will be put back, and you will need to refund the customer separately." : "The customer will be told the order was cancelled. This can't be undone."} confirmLabel="Cancel Order" cancelLabel="Keep Order" tone="danger" className="btn-danger">Cancel</ConfirmSubmit>
                      </form>
                    ) : (
                      <Link href={`/admin/orders/${o.id}`} className="btn-outline">View</Link>
                    )}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={7} className="text-center">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination base="/admin" params={{ sp: sp.sp }} page={orderPage} pages={Math.ceil(recentCount / 5)} param="op" />
      </Panel>

      <Panel title="Stock Update" action={<Link href="/admin/inventory" className="text-sm font-semibold text-[#a10fe4]">Manage inventory</Link>}>
        <div className="mt-4 overflow-x-auto">
          <table className="adm-table">
            <thead>
              <tr><th>Product Name</th><th>Category</th><th>Current Stock</th><th>Status</th><th>Brand</th><th>Action</th></tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td className="!py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[#f9fafb]">
                        {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="36px" className="object-contain" />}
                      </span>
                      <span>
                        <Link href={`/admin/products/${p.id}`} className="block max-w-[260px] truncate font-medium text-[#212529] hover:text-[#a10fe4]">{p.name}</Link>
                        <span className="text-xs">ID: {p.sku}</span>
                      </span>
                    </div>
                  </td>
                  <td>{p.categories[0]?.category.name ?? "-"}</td>
                  <td className="font-num">{p.stockQty}</td>
                  <td>{p.stockStatus === "out_of_stock" ? <Badge tone="danger">Out of Stock</Badge> : <Badge tone="warning">Low Stock</Badge>}</td>
                  <td>{p.brand ?? "-"}</td>
                  <td><Link href={`/admin/inventory?q=${encodeURIComponent(p.sku)}`} className="btn-primary">Restock</Link></td>
                </tr>
              ))}
              {lowStock.length === 0 && <tr><td colSpan={6} className="text-center">Everything is well stocked.</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination base="/admin" params={{ op: sp.op }} page={stockPage} pages={Math.ceil(lowCount / 4)} param="sp" />
      </Panel>
    </div>
  );
}
