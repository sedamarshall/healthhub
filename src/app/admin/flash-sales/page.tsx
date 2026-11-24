import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { deleteFlashSale } from "../actions-more";
import { Actions, Check, DataTable, ExportLink, IconAction, IconLink, ModuleHeader, PrimaryLink, Toolbar, fmtDate, shortId } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

export const metadata = { title: "Flash Sales" };
const PER = 10;

function flashStatus(f: { isActive: boolean; startsAt: Date; endsAt: Date }) {
  const now = new Date();
  if (!f.isActive) return ["Inactive", "warning"] as const;
  if (now < f.startsAt) return ["Scheduled", "info"] as const;
  if (now > f.endsAt) return ["Ended", "neutral"] as const;
  return ["Active", "success"] as const;
}

export default async function FlashSales({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();
  const where: Prisma.FlashSaleWhereInput = {
    ...(sp.q ? { title: { contains: sp.q } } : {}),
    ...(sp.status === "active" ? { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } : sp.status === "scheduled" ? { isActive: true, startsAt: { gt: now } } : sp.status === "ended" ? { endsAt: { lt: now } } : sp.status === "inactive" ? { isActive: false } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.flashSale.count({ where }),
    prisma.flashSale.findMany({ where, orderBy: { startsAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <div>
      <ModuleHeader title="Flash Sales">
        <PrimaryLink href="/admin/flash-sales/new">Create Flash</PrimaryLink>
        <ExportLink href="/admin/export/flash-sales" />
      </ModuleHeader>
      <Toolbar
        action="/admin/flash-sales"
        params={sp}
        filters={[{ name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "scheduled", label: "Scheduled" }, { value: "ended", label: "Ended" }, { value: "inactive", label: "Inactive" }] }]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Title", "Products", "Discount", "Start Date", "End Date", "Status", "Action"]} empty={!rows.length}>
        {rows.map((f) => {
          const [label, tone] = flashStatus(f);
          return (
            <tr key={f.id}>
              <td className="w-10"><Check label={`Select ${f.title}`} /></td>
              <td className="!text-[#495057]">{shortId(f.id)}</td>
              <td>{f.title}</td>
              <td>{f._count.products} Products</td>
              <td>{f.discountPct}%</td>
              <td className="whitespace-nowrap">{fmtDate(f.startsAt)}</td>
              <td className="whitespace-nowrap">{fmtDate(f.endsAt)}</td>
              <td><Badge tone={tone}>{label}</Badge></td>
              <td>
                <Actions>
                  <IconLink href={`/admin/products?flash=${f.id}`} kind="view" label="View products" />
                  <IconLink href={`/admin/flash-sales/${f.id}`} kind="edit" label="Edit flash sale" />
                  <IconAction action={deleteFlashSale} kind="delete" label="Delete flash sale" fields={{ id: f.id }} confirm={`Delete "${f.title}"? Its sale prices will be removed.`} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <AdminPagination base="/admin/flash-sales" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
