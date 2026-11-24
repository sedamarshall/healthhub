import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { deleteCategory } from "../actions";
import { Actions, Check, DataTable, IconAction, IconLink, ModuleHeader, PrimaryLink, ThumbCell, Toolbar, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

export const metadata = { title: "Categories" };
const PER = 10;

export default async function CategoriesList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.CategoryWhereInput = {
    ...(sp.q ? { name: { contains: sp.q } } : {}),
    ...(sp.level === "top" ? { parentId: null } : sp.level === "sub" ? { parentId: { not: null } } : {}),
    ...(sp.status === "visible" ? { isActive: true } : sp.status === "hidden" ? { isActive: false } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: [{ position: "asc" }],
      skip: (page - 1) * PER,
      take: PER,
      include: {
        parent: true,
        _count: { select: { products: true, children: true } },
        products: { take: 1, where: { product: { images: { some: {} } } }, include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } },
      },
    }),
  ]);

  return (
    <div>
      <ModuleHeader title="Categories List">
        <PrimaryLink href="/admin/categories/new">Create Categories</PrimaryLink>
      </ModuleHeader>
      <Toolbar
        action="/admin/categories"
        params={sp}
        filters={[
          { name: "level", label: "Level", options: [{ value: "top", label: "Top level" }, { value: "sub", label: "Sub-category" }] },
          { name: "status", label: "Status", options: [{ value: "visible", label: "Visible" }, { value: "hidden", label: "Hidden" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Icon/ image", "Category Name", "Parent", "Products", "Status", "Action"]} empty={!rows.length}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className="w-10"><Check label={`Select ${c.name}`} /></td>
            <td className="!text-[#495057]">{shortId(c.id)}</td>
            <td><ThumbCell src={c.products[0]?.product.images[0]?.url} title="" /></td>
            <td className="font-medium">{c.name}</td>
            <td>{c.parent?.name ?? "-"}</td>
            <td>{c._count.products}</td>
            <td>{c.isActive ? <Badge tone="success">Visible</Badge> : <Badge tone="neutral">Hidden</Badge>}</td>
            <td>
              <Actions>
                <IconLink href={`/admin/products?category=${c.id}`} kind="view" label="View products" />
                <IconLink href={`/admin/categories/${c.id}`} kind="edit" label="Edit category" />
                {c._count.products === 0 && c._count.children === 0 && (
                  <IconAction action={deleteCategory} kind="delete" label="Delete category" fields={{ id: c.id }} confirm={`Delete category "${c.name}"?`} />
                )}
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/categories" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
