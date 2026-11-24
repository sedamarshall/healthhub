import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { Actions, Check, DataTable, IconAction, ModuleHeader, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

export const metadata = { title: "Inbox" };
const PER = 10;

async function setStatus(f: FormData) {
  "use server";
  await requireStaff();
  await prisma.message.update({ where: { id: Number(f.get("id")) }, data: { status: String(f.get("status")) === "new" ? "new" : "read" } });
  revalidatePath("/admin/messages");
}
async function remove(f: FormData) {
  "use server";
  await requireStaff(["admin"]);
  await prisma.message.delete({ where: { id: Number(f.get("id")) } });
  revalidatePath("/admin/messages");
}

export default async function Inbox({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.MessageWhereInput = {
    ...(sp.kind ? { kind: sp.kind } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { body: { contains: sp.q } }] } : {}),
  };
  const [total, rows] = await Promise.all([prisma.message.count({ where }), prisma.message.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER })]);

  return (
    <div>
      <ModuleHeader title="Inbox" />
      <Toolbar
        action="/admin/messages"
        params={sp}
        filters={[
          { name: "kind", label: "Type", options: [{ value: "contact", label: "Contact form" }, { value: "feedback", label: "Order feedback" }] },
          { name: "status", label: "Status", options: [{ value: "new", label: "New" }, { value: "read", label: "Read" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "From", "Message", "Type", "Status", "Date", "Action"]} empty={!rows.length}>
        {rows.map((m) => (
          <tr key={m.id}>
            <td className="w-10"><Check label="Select message" /></td>
            <td className="!text-[#495057]">{shortId(m.id)}</td>
            <td className="whitespace-nowrap">
              {m.name}
              <a href={`mailto:${m.email}`} className="block text-xs text-[#a10fe4]">{m.email}</a>
              {m.phone && <a href={`tel:${m.phone}`} className="block text-xs text-[#919eab]">{m.phone}</a>}
            </td>
            <td className="max-w-[420px]">
              {m.subject && <span className="block font-semibold">{m.subject}</span>}
              <span className="whitespace-pre-wrap text-[#495057]">{m.body}</span>
              {m.orderId && <Link href={`/admin/orders/${m.orderId}`} className="mt-1 block text-xs text-[#a10fe4]">Related order</Link>}
            </td>
            <td><Badge tone={m.kind === "feedback" ? "purple" : "info"}>{m.kind === "feedback" ? "Feedback" : "Contact"}</Badge></td>
            <td><Badge tone={m.status === "new" ? "warning" : "success"}>{m.status === "new" ? "New" : "Read"}</Badge></td>
            <td className="whitespace-nowrap">{fmtDate(m.createdAt)}</td>
            <td>
              <Actions>
                <IconAction action={setStatus} kind={m.status === "new" ? "approve" : "view"} label={m.status === "new" ? "Mark as read" : "Mark as new"} fields={{ id: m.id, status: m.status === "new" ? "read" : "new" }} />
                <IconAction action={remove} kind="delete" label="Delete message" fields={{ id: m.id }} confirm="Delete this message?" />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/messages" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
