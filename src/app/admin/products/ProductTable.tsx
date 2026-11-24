import type { Prisma } from "@prisma/client";
import { BulkApplyButton } from "../ui/BulkApplyButton";
import { prisma } from "@/lib/db";
import { kes } from "@/lib/utils";
import { bulkProducts, deleteProduct } from "../actions";
import { Actions, Check, DataTable, IconAction, IconLink, ThumbCell, Toolbar, shortId, type FilterDef } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

const PER = 10;

export async function productFilters(): Promise<FilterDef[]> {
  const [cats, brands] = await Promise.all([
    prisma.category.findMany({ where: { parentId: null }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  return [
    { name: "category", label: "Category", options: cats.map((c) => ({ value: String(c.id), label: c.name })) },
    { name: "brand", label: "Brand", options: brands.map((b) => ({ value: b.name, label: b.name })) },
    { name: "rx", label: "Type", options: [{ value: "pom", label: "Prescription (Rx)" }, { value: "otc", label: "Over the counter" }] },
  ];
}

export function productWhere(sp: Record<string, string | undefined>, base: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  const terms = (sp.q ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    ...base,
    ...(terms.length ? { AND: terms.map((t) => ({ OR: [{ name: { contains: t } }, { sku: { contains: t } }, { legacyCode: { equals: t } }, { brand: { contains: t } }] })) } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.category ? { categories: { some: { categoryId: Number(sp.category) } } } : {}),
    ...(sp.brand ? { brand: sp.brand } : {}),
    ...(sp.rx ? { rxClass: sp.rx } : {}),
    ...(sp.review ? { needsReview: true } : {}),
    ...(sp.flash ? { flashSaleId: Number(sp.flash) } : {}),
  };
}

export const statusBadge = (s: string) => (s === "active" ? <Badge tone="success">Publish</Badge> : s === "draft" ? <Badge tone="warning">Draft</Badge> : <Badge tone="neutral">Archived</Badge>);

/** "Product List" / "Draft Products" table with filters, bulk actions and pagination. */
export async function ProductTable({ base, sp, where, statusFilter = true }: { base: string; sp: Record<string, string | undefined>; where: Prisma.ProductWhereInput; statusFilter?: boolean }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const [total, rows, filters] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      include: { images: { take: 1, orderBy: { position: "asc" } }, categories: { take: 1, orderBy: { categoryId: "desc" }, include: { category: true } } },
    }),
    productFilters(),
  ]);
  const allFilters = statusFilter
    ? [...filters, { name: "status", label: "Status", options: [{ value: "active", label: "Publish" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }] }]
    : filters;

  return (
    <>
      <Toolbar action={base} params={sp} filters={allFilters} placeholder="Search name, SKU, brand..." />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Product", "Category", "Price", "Brand", "Status", "Action"]} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="w-10"><Check name="ids" value={p.id} form="bulk-products" label={`Select ${p.name}`} /></td>
            <td className="whitespace-nowrap !text-[#495057]">{shortId(p.id)}</td>
            <td>
              <ThumbCell src={p.images[0]?.url} title={p.name} sub={p.rxClass === "pom" ? `${p.sku} · Rx` : p.sku} href={`/admin/products/${p.id}`} />
            </td>
            <td className="max-w-[160px] truncate">{p.categories[0]?.category.name ?? "-"}</td>
            <td className="whitespace-nowrap font-semibold !text-[#a10fe4]">{kes(p.salePrice && p.salePrice < p.price ? p.salePrice : p.price)}</td>
            <td className="max-w-[140px] truncate">{p.brand ?? "-"}</td>
            <td>{statusBadge(p.status)}</td>
            <td>
              <Actions>
                <IconLink href={`/admin/products/${p.id}`} kind="view" label="View product" />
                <IconLink href={`/admin/products/${p.id}/edit`} kind="edit" label="Edit product" />
                <IconAction action={deleteProduct} kind="delete" label="Delete product" fields={{ id: p.id }} confirm={`Delete "${p.name}"? Products with orders are archived instead.`} />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form id="bulk-products" action={bulkProducts} className="flex items-center gap-2 pt-5 text-sm">
          <select name="action" aria-label="Bulk action" className="h-9 rounded-full bg-[#f4f6f8] px-3 text-sm outline-none">
            <option value="activate">Publish selected</option>
            <option value="draft">Move to draft</option>
            <option value="archive">Archive</option>
            <option value="rx">Mark prescription-only</option>
            <option value="otc">Mark over-the-counter</option>
            <option value="feature">Feature on home page</option>
            <option value="unfeature">Remove from home page</option>
            <option value="reviewed">Mark reviewed</option>
          </select>
          <BulkApplyButton formId="bulk-products" className="h-9 rounded-full px-4 text-sm font-bold shadow-[0_0_0_1px_rgba(145,158,171,0.32)] hover:bg-[#f9fafb]" />
        </form>
        <AdminPagination base={base} params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
      </div>
    </>
  );
}
