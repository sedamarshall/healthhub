import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { setStock } from "../actions";
import { Check, DataTable, ExportLink, IconLink, ModuleHeader, ThumbCell, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";
import { productFilters } from "../products/ProductTable";

export const metadata = { title: "Manage Inventory" };
const PER = 10;

export default async function Inventory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : 0;
  const where: Prisma.ProductWhereInput = {
    status: { not: "archived" },
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { sku: { contains: sp.q } }] } : {}),
    ...(sp.category ? { categories: { some: { categoryId: Number(sp.category) } } } : {}),
    ...(since ? { updatedAt: { gte: new Date(Date.now() - since * 86400000) } } : {}),
    ...(sp.view === "low" ? { stockStatus: "in_stock", stockQty: { lte: 3 } } : sp.view === "out" ? { stockStatus: "out_of_stock" } : {}),
  };
  const [total, rows, filters] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ stockQty: "asc" }, { name: "asc" }],
      skip: (page - 1) * PER,
      take: PER,
      include: { images: { take: 1, orderBy: { position: "asc" } }, categories: { take: 1, orderBy: { categoryId: "desc" }, include: { category: true } } },
    }),
    productFilters(),
  ]);
  const sold = await prisma.orderItem.groupBy({ by: ["productId"], where: { productId: { in: rows.map((r) => r.id) }, order: { paymentStatus: "paid" } }, _sum: { qty: true } });
  const soldOf = (id: number) => sold.find((s) => s.productId === id)?._sum.qty ?? 0;

  return (
    <div>
      <ModuleHeader title="Manage Inventory">
        <ExportLink href="/admin/export/inventory" />
      </ModuleHeader>
      <Toolbar
        action="/admin/inventory"
        params={sp}
        filters={[
          filters[0],
          { name: "view", label: "Stock", options: [{ value: "low", label: "Low stock (≤3)" }, { value: "out", label: "Out of stock" }] },
          { name: "date", label: "Date", options: [{ value: "7", label: "Updated in last 7 days" }, { value: "30", label: "Updated in last 30 days" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Name", "Category", "Stock", "Sold Out", "Date", "Update stock", "Action"]} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="w-10"><Check label={`Select ${p.name}`} /></td>
            <td className="!text-[#495057]">{shortId(p.id)}</td>
            <td>
              <ThumbCell src={p.images[0]?.url} title={p.name} sub={p.sku} />
            </td>
            <td className="max-w-[140px] truncate">{p.categories[0]?.category.name ?? "-"}</td>
            <td className="whitespace-nowrap">
              {p.stockQty} pcs {p.stockStatus === "out_of_stock" && <Badge tone="danger">Out</Badge>}
              {p.stockStatus === "special_order" && <Badge tone="info">Order</Badge>}
            </td>
            <td className="whitespace-nowrap">{soldOf(p.id)} pcs</td>
            <td className="whitespace-nowrap">{fmtDate(p.updatedAt)}</td>
            <td>
              <form action={setStock} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input name="qty" type="number" min={0} defaultValue={p.stockQty} aria-label={`New stock for ${p.name}`} className="h-9 w-20 rounded-full border border-[rgba(145,158,171,0.32)] px-3 text-sm outline-none focus:border-[#a10fe4]" />
                <button className="h-9 rounded-full bg-[#a10fe4] px-3 text-xs font-bold text-white hover:bg-[#850cbd]">Save</button>
              </form>
            </td>
            <td><IconLink href={`/admin/products/${p.id}`} kind="view" label="View product" /></td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/inventory" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
