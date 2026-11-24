import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { kes } from "@/lib/utils";
import { DataTable, ExportLink, ModuleHeader, PrimaryLink, ThumbCell, Tile, Toolbar, Check, fmtDate, shortId } from "../../ui/kit";
import { AdminPagination, Badge } from "../../ui/widgets";
import { IPackage } from "../../ui/icons";
import { productFilters, productWhere, statusBadge } from "../ProductTable";

export const metadata = { title: "Stock Products" };
const PER = 10;

export default async function StockProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const range: Prisma.ProductWhereInput =
    sp.range === "low" ? { stockStatus: "in_stock", stockQty: { lte: 3 } } : sp.range === "out" ? { stockStatus: "out_of_stock" } : sp.range === "available" ? { stockStatus: "in_stock", stockQty: { gt: 3 } } : sp.range === "order" ? { stockStatus: "special_order" } : {};
  const where = { ...productWhere(sp), ...range };
  const [total, rows, all, inStock, low, out, filters] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ stockQty: "asc" }, { id: "desc" }],
      skip: (page - 1) * PER,
      take: PER,
      include: { images: { take: 1, orderBy: { position: "asc" } }, categories: { take: 1, orderBy: { categoryId: "desc" }, include: { category: true } } },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { stockStatus: "in_stock", stockQty: { gt: 0 } } }),
    prisma.product.count({ where: { stockStatus: "in_stock", stockQty: { lte: 3 } } }),
    prisma.product.count({ where: { stockStatus: "out_of_stock" } }),
    productFilters(),
  ]);

  return (
    <div>
      <ModuleHeader title="Stock Products">
        <ExportLink href="/admin/export/inventory" />
        <PrimaryLink href="/admin/inventory">Add Stock</PrimaryLink>
      </ModuleHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Total Products" value={all} bg="rgba(160,226,224,0.6)" icon={<IPackage />} />
        <Tile label="In Stock Products" value={inStock} bg="rgba(255,235,105,0.6)" icon={<IPackage />} />
        <Tile label="Low Stock Products" value={low} bg="rgba(158,232,114,0.6)" icon={<IPackage />} />
        <Tile label="Out of Stock" value={out} bg="rgba(255,214,239,0.6)" icon={<IPackage />} />
      </div>
      <Toolbar
        action="/admin/products/stocks"
        params={sp}
        filters={[
          filters[0],
          { name: "status", label: "Status", options: [{ value: "active", label: "Published" }, { value: "draft", label: "Draft" }] },
          { name: "range", label: "Stock Range", options: [{ value: "available", label: "Available (4+)" }, { value: "low", label: "Low (0–3)" }, { value: "out", label: "Out of stock" }, { value: "order", label: "Special order" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Product", "Category", "Price", "Quantity", "Stock", "Brand", "Last Updated", "Status"]} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="w-10"><Check label={`Select ${p.name}`} /></td>
            <td className="whitespace-nowrap !text-[#495057]">{shortId(p.id)}</td>
            <td><ThumbCell src={p.images[0]?.url} title={p.name} href={`/admin/products/${p.id}`} /></td>
            <td className="max-w-[140px] truncate">{p.categories[0]?.category.name ?? "-"}</td>
            <td className="whitespace-nowrap">{kes(p.price)}</td>
            <td className="whitespace-nowrap">{p.stockQty} pcs</td>
            <td>
              {p.stockStatus === "out_of_stock" ? (
                <span className="adm-badge bg-[#cb0233] text-white">Out of Stock</span>
              ) : p.stockStatus === "special_order" ? (
                <Badge tone="info">Special order</Badge>
              ) : p.stockQty <= 3 ? (
                <span className="adm-badge bg-[#ffc107] text-[#212529]">Low stock</span>
              ) : (
                <span className="adm-badge bg-[#9ee872] text-[#212529]">Available stock</span>
              )}
            </td>
            <td className="max-w-[120px] truncate">{p.brand ?? "-"}</td>
            <td className="whitespace-nowrap">{fmtDate(p.updatedAt)}</td>
            <td>{statusBadge(p.status)}</td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/products/stocks" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
