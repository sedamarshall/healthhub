import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { htmlToText } from "@/lib/utils";
import { deletePage } from "../../actions-more";
import { Actions, DataTable, IconAction, IconLink, ModuleHeader, PrimaryLink, Toolbar, shortId } from "../../ui/kit";
import { AdminPagination, Badge } from "../../ui/widgets";

const META: Record<string, { title: string; create: string; head: string[] }> = {
  faq: { title: "FAQ", create: "Create FAQ", head: ["ID", "FAQ Question", "FAQ Answer", "Sort", "Status", "Action"] },
  privacy: { title: "Privacy Policy", create: "Create Privacy Policy", head: ["ID", "Title", "Details", "Short Order", "Status", "Action"] },
  terms: { title: "Terms & Condition", create: "Create Terms", head: ["ID", "Title", "Details", "Short Order", "Status", "Action"] },
  about: { title: "About Us", create: "Create Section", head: ["ID", "Title", "Details", "Short Order", "Status", "Action"] },
};
const PER = 10;

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  return { title: META[(await params).kind]?.title ?? "Content" };
}

export default async function ContentList({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const { kind } = await params;
  const meta = META[kind];
  if (!meta) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.PageWhereInput = {
    kind,
    ...(sp.q ? { OR: [{ title: { contains: sp.q } }, { content: { contains: sp.q } }] } : {}),
    ...(sp.status ? { status: sp.status } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({ where, orderBy: [{ position: "asc" }, { id: "asc" }], skip: (page - 1) * PER, take: PER }),
  ]);
  return (
    <div>
      <ModuleHeader title={meta.title}>
        <PrimaryLink href={`/admin/content/${kind}/new`}>{meta.create}</PrimaryLink>
      </ModuleHeader>
      <Toolbar action={`/admin/content/${kind}`} params={sp} filters={[{ name: "status", label: "Status", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] }]} />
      <DataTable head={meta.head} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="!text-[#495057]">{shortId(p.id)}</td>
            <td className="max-w-[280px] truncate">{p.title}</td>
            <td className="max-w-[320px] truncate !text-[#495057]">{htmlToText(p.content)}</td>
            <td>{p.position}</td>
            <td>{p.status === "published" ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}</td>
            <td>
              <Actions>
                <IconLink href={`/admin/content/${kind}/${p.id}`} kind="edit" label="Edit" />
                <IconAction action={deletePage} kind="delete" label="Delete" fields={{ id: p.id }} confirm={`Delete "${p.title}"?`} />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base={`/admin/content/${kind}`} params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
