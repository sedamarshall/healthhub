import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { kes } from "@/lib/utils";
import { deleteCustomer, toggleUserActive } from "../actions-more";
import { Actions, Check, DataTable, ExportLink, IconAction, IconLink, ModuleHeader, PrimaryLink, TabLinks, ThumbCell, Tile, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";
import { ICart, ITransaction, IUsers } from "../ui/icons";

export const metadata = { title: "Customers" };
const PER = 10;
const phone = (p: string | null) => (p ? `0${p.slice(3)}` : "-");

/**
 * Customers module (separate from staff Users): shoppers with an account, plus guest buyers
 * (people who checked out without an account, grouped by email).
 */
export default async function Customers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const guest = sp.type === "guest";
  const page = Math.max(1, Number(sp.page) || 1);

  const [registered, guestGroups, buyers30] = await Promise.all([
    prisma.user.count({ where: { role: "customer" } }),
    prisma.order.groupBy({ by: ["email"], where: { userId: null } }),
    prisma.order.groupBy({ by: ["email"], where: { createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }),
  ]);

  return (
    <div>
      <ModuleHeader title="Customers">
        <ExportLink href="/admin/export/customers" />
        <PrimaryLink href="/admin/users/new?role=customer&back=/admin/customers">Add Customer</PrimaryLink>
      </ModuleHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tile label="Registered customers" value={registered} bg="rgba(239,214,252,0.8)" icon={<IUsers />} />
        <Tile label="Guest buyers" value={guestGroups.length} bg="rgba(160,226,224,0.6)" icon={<ICart className="h-6 w-6" />} />
        <Tile label="Bought in the last 30 days" value={buyers30.length} bg="rgba(255,235,105,0.6)" icon={<ITransaction className="h-6 w-6" />} />
      </div>
      <TabLinks
        active={guest ? "guest" : "registered"}
        tabs={[
          { key: "registered", label: `Registered (${registered})`, href: "/admin/customers" },
          { key: "guest", label: `Guest buyers (${guestGroups.length})`, href: "/admin/customers?type=guest" },
        ]}
      />
      {guest ? <GuestTable sp={sp} page={page} /> : <RegisteredTable sp={sp} page={page} />}
    </div>
  );
}

async function RegisteredTable({ sp, page }: { sp: Record<string, string | undefined>; page: number }) {
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : sp.date === "365" ? 365 : 0;
  const where: Prisma.UserWhereInput = {
    role: "customer",
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { phone: { contains: sp.q.replace(/^0/, "") } }] } : {}),
    ...(sp.status === "active" ? { isActive: true } : sp.status === "inactive" ? { isActive: false } : {}),
    ...(since ? { createdAt: { gte: new Date(Date.now() - since * 864e5) } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
  ]);
  const ids = rows.map((r) => r.id);
  const [all, paid] = ids.length
    ? await Promise.all([
        prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: { _all: true }, _max: { createdAt: true } }),
        prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids }, paymentStatus: "paid" }, _sum: { total: true } }),
      ])
    : [[], []];
  const stat = (id: number) => ({
    orders: all.find((a) => a.userId === id)?._count._all ?? 0,
    last: all.find((a) => a.userId === id)?._max.createdAt ?? null,
    spent: paid.find((a) => a.userId === id)?._sum.total ?? 0,
  });

  return (
    <>
      <Toolbar
        action="/admin/customers"
        params={sp}
        placeholder="Search name, email or phone..."
        filters={[
          { name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
          { name: "date", label: "Joined", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "365", label: "Last 12 months" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Customer", "Email", "Phone Number", "Orders", "Total Spent", "Last Order", "Status", "Joined", "Action"]} empty={!rows.length}>
        {rows.map((u) => {
          const s = stat(u.id);
          return (
            <tr key={u.id}>
              <td className="w-10"><Check label={`Select ${u.name}`} /></td>
              <td className="!text-[#495057]">{shortId(u.id)}</td>
              <td><ThumbCell title={u.name} src={u.avatar} round href={`/admin/customers/${u.id}`} /></td>
              <td className="max-w-[200px] truncate">{u.email}</td>
              <td className="whitespace-nowrap">{phone(u.phone)}</td>
              <td>{s.orders}</td>
              <td className="whitespace-nowrap">{kes(s.spent)}</td>
              <td className="whitespace-nowrap">{s.last ? fmtDate(s.last) : "-"}</td>
              <td><Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
              <td className="whitespace-nowrap">{fmtDate(u.createdAt)}</td>
              <td>
                <Actions>
                  <IconLink href={`/admin/customers/${u.id}`} kind="view" label="View customer" />
                  <IconLink href={`/admin/users/${u.id}?back=${encodeURIComponent("/admin/customers")}`} kind="edit" label="Edit customer" />
                  <IconAction action={toggleUserActive} kind={u.isActive ? "ban" : "approve"} label={u.isActive ? "Deactivate (block sign-in)" : "Activate"} fields={{ id: u.id }} confirm={u.isActive ? `Deactivate ${u.name}? They won't be able to sign in.` : undefined} />
                  <IconAction action={deleteCustomer} kind="delete" label="Delete customer" fields={{ id: u.id }} confirm={s.orders ? `${u.name} has orders, so the account will be deactivated instead of deleted.` : `Delete ${u.name}'s account?`} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <AdminPagination base="/admin/customers" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </>
  );
}

/** People who checked out as guests, one row per email. */
async function GuestTable({ sp, page }: { sp: Record<string, string | undefined>; page: number }) {
  const where: Prisma.OrderWhereInput = {
    userId: null,
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { phone: { contains: sp.q.replace(/^0/, "") } }] } : {}),
  };
  const groups = await prisma.order.groupBy({ by: ["email"], where, _count: { _all: true }, _max: { createdAt: true }, orderBy: { _max: { createdAt: "desc" } } });
  const pageGroups = groups.slice((page - 1) * PER, page * PER);
  const emails = pageGroups.map((g) => g.email);
  const [latest, paid] = emails.length
    ? await Promise.all([
        prisma.order.findMany({ where: { userId: null, email: { in: emails } }, orderBy: { createdAt: "desc" }, select: { email: true, name: true, phone: true } }),
        prisma.order.groupBy({ by: ["email"], where: { userId: null, email: { in: emails }, paymentStatus: "paid" }, _sum: { total: true } }),
      ])
    : [[], []];

  return (
    <>
      <Toolbar action="/admin/customers" params={sp} placeholder="Search name, email or phone..." />
      <p className="mb-4 text-sm text-[#637381]">These shoppers checked out without creating an account. If they register later with the same email, their orders move to their account.</p>
      <DataTable head={["Customer", "Email", "Phone Number", "Orders", "Total Spent", "Last Order", "Action"]} empty={!pageGroups.length}>
        {pageGroups.map((g) => {
          const who = latest.find((o) => o.email === g.email);
          return (
            <tr key={g.email}>
              <td><ThumbCell title={who?.name ?? g.email} round /></td>
              <td className="max-w-[220px] truncate">{g.email}</td>
              <td className="whitespace-nowrap">{phone(who?.phone ?? null)}</td>
              <td>{g._count._all}</td>
              <td className="whitespace-nowrap">{kes(paid.find((p) => p.email === g.email)?._sum.total ?? 0)}</td>
              <td className="whitespace-nowrap">{fmtDate(g._max.createdAt)}</td>
              <td><IconLink href={`/admin/orders?q=${encodeURIComponent(g.email)}`} kind="view" label="View their orders" /></td>
            </tr>
          );
        })}
      </DataTable>
      <AdminPagination base="/admin/customers" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(groups.length / PER)} />
    </>
  );
}
