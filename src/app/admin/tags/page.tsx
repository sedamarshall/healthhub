import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { deleteTag } from "../actions-more";
import { Actions, Check, DataTable, IconAction, IconLink, ModuleHeader, PrimaryLink, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination } from "../ui/widgets";

export const metadata = { title: "Tags" };
const PER = 10;

export default async function TagsList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(sp.q ? { name: { contains: sp.q } } : {}),
    ...(sp.used === "yes" ? { products: { some: {} } } : sp.used === "no" ? { products: { none: {} } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.tag.count({ where }),
    prisma.tag.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <div>
      <ModuleHeader title="Tags List">
        <PrimaryLink href="/admin/tags/new">Create Tags</PrimaryLink>
      </ModuleHeader>
      <Toolbar action="/admin/tags" params={sp} filters={[{ name: "used", label: "Usage", options: [{ value: "yes", label: "Used on products" }, { value: "no", label: "Unused" }] }]} />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Tags", "Products", "Date", "Action"]} empty={!rows.length}>
        {rows.map((t) => (
          <tr key={t.id}>
            <td className="w-10"><Check label={`Select ${t.name}`} /></td>
            <td className="!text-[#495057]">{shortId(t.id)}</td>
            <td className="font-medium">{t.name}</td>
            <td>{t._count.products}</td>
            <td>{fmtDate(t.createdAt)}</td>
            <td>
              <Actions>
                <IconLink href={`/admin/tags/${t.id}`} kind="edit" label="Edit tag" />
                <IconAction action={deleteTag} kind="delete" label="Delete tag" fields={{ id: t.id }} confirm={`Delete tag "${t.name}"? It will be removed from ${t._count.products} products.`} />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/tags" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
