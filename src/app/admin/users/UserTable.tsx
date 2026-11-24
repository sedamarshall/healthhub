import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteCustomer, toggleUserActive } from "../actions-more";
import { Actions, Check, DataTable, IconAction, IconLink, ThumbCell, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

const PER = 10;
const ROLE_TONE = { admin: "danger", pharmacist: "warning", customer: "success" } as const;
const ROLE_LABEL = { admin: "Master Admin", pharmacist: "Pharmacist", customer: "Customer" } as Record<string, string>;

export async function UserTable({
  base,
  sp,
  where,
  me,
  variant,
}: {
  base: string;
  sp: Record<string, string | undefined>;
  where: Prisma.UserWhereInput;
  me: number;
  variant: "users" | "admins" | "customers";
}) {
  const page = Math.max(1, Number(sp.page) || 1);
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : sp.date === "365" ? 365 : 0;
  const full: Prisma.UserWhereInput = {
    ...where,
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { phone: { contains: sp.q.replace(/^0/, "") } }] } : {}),
    ...(sp.status === "active" ? { isActive: true } : sp.status === "inactive" ? { isActive: false } : {}),
    ...(sp.role && variant !== "customers" ? { role: sp.role } : {}),
    ...(since ? { createdAt: { gte: new Date(Date.now() - since * 86400000) } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where: full }),
    prisma.user.findMany({ where: full, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { orders: true } } } }),
  ]);
  const filters = [
    ...(variant !== "customers" ? [{ name: "role", label: "Role", options: (variant === "admins" ? ["admin", "pharmacist"] : ["admin", "pharmacist", "customer"]).map((r) => ({ value: r, label: ROLE_LABEL[r] })) }] : []),
    { name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
    { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "365", label: "Last 12 months" }] },
  ];
  const head =
    variant === "customers"
      ? [<span key="c" className="sr-only">Select</span>, "ID", "Users", "Email", "Phone Number", "Orders", "Status", "Date", "Action"]
      : [<span key="c" className="sr-only">Select</span>, "ID", "User", "Email", "Roles", "Date", "Active status", "Action"];

  return (
    <>
      <Toolbar action={base} params={sp} filters={filters} />
      <DataTable head={head} empty={!rows.length}>
        {rows.map((u) => (
          <tr key={u.id}>
            <td className="w-10"><Check label={`Select ${u.name}`} /></td>
            <td className="!text-[#495057]">{shortId(u.id)}</td>
            <td><ThumbCell title={u.name} src={u.avatar} round href={variant === "customers" ? `/admin/customers/${u.id}` : undefined} /></td>
            <td className="max-w-[200px] truncate">{u.email}</td>
            {variant === "customers" ? (
              <>
                <td className="whitespace-nowrap">{u.phone ? `+${u.phone.slice(0, 3)} ${u.phone.slice(3)}` : "-"}</td>
                <td>{u._count.orders}</td>
                <td><Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="whitespace-nowrap">{fmtDate(u.createdAt)}</td>
              </>
            ) : (
              <>
                <td><Badge tone={ROLE_TONE[u.role as keyof typeof ROLE_TONE] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge></td>
                <td className="whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                <td><Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
              </>
            )}
            <td>
              <Actions>
                {variant === "customers" && <IconLink href={`/admin/customers/${u.id}`} kind="view" label="View customer" />}
                <IconLink href={`/admin/users/${u.id}?back=${encodeURIComponent(base)}`} kind="edit" label="Edit user" />
                {u.id !== me && (
                  <IconAction
                    action={toggleUserActive}
                    kind={u.isActive ? "ban" : "approve"}
                    label={u.isActive ? "Deactivate (block sign-in)" : "Activate"}
                    fields={{ id: u.id }}
                    confirm={u.isActive ? `Deactivate ${u.name}? They won't be able to sign in.` : undefined}
                  />
                )}
                {variant === "customers" && (
                  <IconAction action={deleteCustomer} kind="delete" label="Delete customer" fields={{ id: u.id }} confirm={u._count.orders ? `${u.name} has orders, so the account will be deactivated instead of deleted.` : `Delete ${u.name}'s account?`} />
                )}
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base={base} params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </>
  );
}
