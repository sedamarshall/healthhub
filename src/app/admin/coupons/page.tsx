import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { couponStatus } from "@/lib/coupons";
import { kes } from "@/lib/utils";
import { deleteCoupon } from "../actions-more";
import { Actions, Check, DataTable, ExportLink, IconAction, IconLink, ModuleHeader, PrimaryLink, Tile, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";
import { IPackage, ITag, IUsers, IBan } from "../ui/icons";

export const metadata = { title: "Coupons" };
const PER = 10;

export default async function Coupons({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();
  const where: Prisma.CouponWhereInput = {
    ...(sp.q ? { OR: [{ code: { contains: sp.q.toUpperCase() } }, { title: { contains: sp.q } }] } : {}),
    ...(sp.status === "active" ? { isActive: true, OR: [{ endsAt: null }, { endsAt: { gte: now } }] } : sp.status === "expired" ? { endsAt: { lt: now } } : sp.status === "inactive" ? { isActive: false } : {}),
    ...(sp.start ? { startsAt: { gte: new Date(sp.start) } } : {}),
    ...(sp.end ? { endsAt: { lte: new Date(sp.end) } } : {}),
  };
  const [total, rows, all, active, expired, used] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.coupon.count(),
    prisma.coupon.count({ where: { isActive: true, OR: [{ endsAt: null }, { endsAt: { gte: now } }] } }),
    prisma.coupon.count({ where: { endsAt: { lt: now } } }),
    prisma.order.count({ where: { couponCode: { not: null }, paymentStatus: "paid" } }),
  ]);
  const tone = (s: string) => (s === "Active" ? "success" : s === "Scheduled" ? "info" : "danger") as "success";

  return (
    <div>
      <ModuleHeader title="Coupon">
        <PrimaryLink href="/admin/coupons/new">Create Coupon</PrimaryLink>
        <ExportLink href="/admin/export/coupons" />
      </ModuleHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Total Coupons" value={all} bg="rgba(160,226,224,0.6)" icon={<ITag className="h-6 w-6" />} />
        <Tile label="Active Coupons" value={active} bg="rgba(255,235,105,0.6)" icon={<IPackage />} />
        <Tile label="Expired Coupons" value={expired} bg="rgba(255,192,145,0.6)" icon={<IBan className="h-6 w-6" />} />
        <Tile label="Total orders using coupons" value={used} bg="rgba(255,214,239,0.6)" icon={<IUsers className="h-6 w-6" />} />
      </div>
      <Toolbar
        action="/admin/coupons"
        params={sp}
        filters={[{ name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "inactive", label: "Inactive" }] }]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Title", "Code", "Coupon Amount", "Min Amount", "Used / Limit", "Start Date", "End Date", "Status", "Action"]} empty={!rows.length}>
        {rows.map((c) => {
          const st = couponStatus(c);
          return (
            <tr key={c.id}>
              <td className="w-10"><Check label={`Select ${c.code}`} /></td>
              <td className="!text-[#495057]">{shortId(c.id)}</td>
              <td className="whitespace-nowrap">{c.title}</td>
              <td className="font-semibold">{c.code}</td>
              <td className="whitespace-nowrap">{c.type === "percent" ? `${c.value}%` : kes(c.value)}</td>
              <td className="whitespace-nowrap">{c.minOrder ? kes(c.minOrder) : "-"}</td>
              <td>{c.used} / {c.usageLimit ?? "∞"}</td>
              <td className="whitespace-nowrap">{fmtDate(c.startsAt)}</td>
              <td className="whitespace-nowrap">{fmtDate(c.endsAt)}</td>
              <td><Badge tone={tone(st)}>{st}</Badge></td>
              <td>
                <Actions>
                  <IconLink href={`/admin/coupons/${c.id}`} kind="edit" label="Edit coupon" />
                  <IconAction action={deleteCoupon} kind="delete" label="Delete coupon" fields={{ id: c.id }} confirm={`Delete coupon ${c.code}?`} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <AdminPagination base="/admin/coupons" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
