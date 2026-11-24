import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { effectivePrice, kes } from "@/lib/utils";
import { deleteCart } from "../actions-more";
import { Actions, Check, DataTable, ExportLink, IconAction, IconLink, ModuleHeader, Toolbar, fmtDate } from "../ui/kit";
import { AdminPagination } from "../ui/widgets";

export const metadata = { title: "Abandoned cart" };
const PER = 10;

/** Carts with items that haven't been touched for at least an hour. */
export default async function AbandonedCarts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const older = sp.age === "24h" ? 24 : sp.age === "7d" ? 168 : 1;
  const where: Prisma.CartWhereInput = {
    items: { some: {} },
    updatedAt: { lt: new Date(Date.now() - older * 3600_000) },
    ...(sp.customer === "registered" ? { userId: { not: null } } : sp.customer === "guest" ? { userId: null } : {}),
    ...(sp.q ? { user: { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }] } } : {}),
  };
  const [total, carts] = await Promise.all([
    prisma.cart.count({ where }),
    prisma.cart.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { user: true, items: { include: { product: true } } } }),
  ]);

  return (
    <div>
      <ModuleHeader title="Abandoned cart">
        <ExportLink href="/admin/export/carts" />
      </ModuleHeader>
      <Toolbar
        action="/admin/abandoned-carts"
        params={sp}
        placeholder="Search customer..."
        filters={[
          { name: "customer", label: "Customer", options: [{ value: "registered", label: "Registered" }, { value: "guest", label: "Guest" }] },
          { name: "age", label: "Idle for", options: [{ value: "24h", label: "24 hours+" }, { value: "7d", label: "7 days+" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Customer", "Items", "Amount", "Date", "Action"]} empty={!carts.length}>
        {carts.map((c) => (
          <tr key={c.id}>
            <td className="w-10"><Check label="Select cart" /></td>
            <td className="!text-[#495057]">#{c.id.slice(-6).toUpperCase()}</td>
            <td>{c.user ? <span>{c.user.name}<span className="block text-xs text-[#919eab]">{c.user.email}</span></span> : <span className="text-[#919eab]">Guest</span>}</td>
            <td>{c.items.reduce((a, i) => a + i.qty, 0)} pcs</td>
            <td className="whitespace-nowrap">{kes(c.items.reduce((a, i) => a + effectivePrice(i.product) * i.qty, 0))}</td>
            <td className="whitespace-nowrap">{fmtDate(c.updatedAt)}</td>
            <td>
              <Actions>
                <IconLink href={`/admin/abandoned-carts/${c.id}`} kind="view" label="View cart" />
                <IconAction action={deleteCart} kind="delete" label="Delete cart" fields={{ id: c.id }} confirm="Delete this cart? The shopper will lose its contents." />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/abandoned-carts" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
