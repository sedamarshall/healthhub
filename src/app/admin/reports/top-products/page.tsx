import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { tileStyle } from "@/lib/tile";
import { kes } from "@/lib/utils";
import { Check, DataTable, ExportLink, IconLink, ModuleHeader, ThumbCell, Toolbar } from "../../ui/kit";
import { AdminPagination } from "../../ui/widgets";
import { statusBadge } from "../../products/ProductTable";

export const metadata = { title: "Top products, categories" };
const PER = 10;

/** Best sellers by units sold on paid orders, plus top categories. */
export default async function TopProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const days = sp.date === "7" ? 7 : sp.date === "30" ? 30 : sp.date === "90" ? 90 : 3650;
  const from = new Date(Date.now() - days * 86400000);
  const sold = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { paymentStatus: "paid", paidAt: { gte: from } } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
  });
  const ids = sold.map((s) => s.productId!);
  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      ...(sp.q ? { name: { contains: sp.q } } : {}),
      ...(sp.category ? { categories: { some: { categoryId: Number(sp.category) } } } : {}),
    },
    include: { images: { take: 1, orderBy: { position: "asc" } }, categories: { include: { category: true } } },
  });
  const ranked = sold.map((s) => ({ p: products.find((p) => p.id === s.productId), qty: s._sum.qty ?? 0 })).filter((r) => r.p);
  const revenue = await prisma.orderItem.findMany({ where: { productId: { in: ids }, order: { paymentStatus: "paid", paidAt: { gte: from } } }, select: { productId: true, price: true, qty: true } });
  const revOf = (id: number) => revenue.filter((r) => r.productId === id).reduce((a, r) => a + r.price * r.qty, 0);

  // Top-level categories by revenue
  const catTotals = new Map<string, number>();
  for (const r of ranked) {
    const top = r.p!.categories.map((c) => c.category).find((c) => c.parentId === null);
    if (top) catTotals.set(top.name, (catTotals.get(top.name) ?? 0) + revOf(r.p!.id));
  }
  const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const cats = await prisma.category.findMany({ where: { parentId: null }, orderBy: { position: "asc" }, select: { id: true, name: true } });
  const pageRows = ranked.slice((page - 1) * PER, page * PER);

  return (
    <div>
      <ModuleHeader title="Top Products List">
        <ExportLink href={`/admin/export/top-products?days=${days}`} />
      </ModuleHeader>
      {topCats.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {topCats.map(([name, total], i) => (
            <div key={name} className="tile-tint rounded-2xl p-4" style={tileStyle(["rgba(160,226,224,0.6)", "rgba(255,235,105,0.6)", "rgba(255,192,145,0.6)", "rgba(255,214,239,0.6)", "rgba(146,189,245,0.6)", "rgba(158,232,114,0.6)"][i])}>
              <p className="tile-label truncate text-sm font-semibold text-[#495057]">#{i + 1} {name}</p>
              <p className="tile-value font-num text-lg font-bold">{kes(total)}</p>
            </div>
          ))}
        </div>
      )}
      <Toolbar
        action="/admin/reports/top-products"
        params={sp}
        filters={[
          { name: "category", label: "Category", options: cats.map((c) => ({ value: String(c.id), label: c.name })) },
          { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "Rank", "Product", "Category", "Price", "Units Sold", "Revenue", "Status", "Action"]} empty={!pageRows.length}>
        {pageRows.map(({ p, qty }, i) => (
          <tr key={p!.id}>
            <td className="w-10"><Check label={`Select ${p!.name}`} /></td>
            <td className="!text-[#495057]">#{(page - 1) * PER + i + 1}</td>
            <td><ThumbCell src={p!.images[0]?.url} title={p!.name} href={`/admin/products/${p!.id}`} /></td>
            <td className="max-w-[140px] truncate">{p!.categories[0]?.category.name ?? "-"}</td>
            <td className="whitespace-nowrap">{kes(p!.price)}</td>
            <td>{qty}</td>
            <td className="whitespace-nowrap font-semibold !text-[#a10fe4]">{kes(revOf(p!.id))}</td>
            <td>{statusBadge(p!.status)}</td>
            <td><IconLink href={`/admin/products/${p!.id}`} kind="view" label="View product" /></td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/reports/top-products" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(ranked.length / PER)} />
    </div>
  );
}
