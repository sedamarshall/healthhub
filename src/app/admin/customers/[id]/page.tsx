import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { kes } from "@/lib/utils";
import { DataTable, IconLink, ModuleHeader, Section, Tile, fmtDate } from "../../ui/kit";
import { Badge, OrderBadge, PayOutline } from "../../ui/widgets";
import { ICart, IPackage, ITransaction } from "../../ui/icons";

export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  const id = Number((await params).id);
  const u = await prisma.user.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: "desc" }, include: { items: { select: { qty: true } } } }, reviews: true } });
  if (!u) notFound();
  const paid = u.orders.filter((o) => o.paymentStatus === "paid");
  const spent = paid.reduce((a, o) => a + o.total, 0);

  return (
    <div className="space-y-6">
      <ModuleHeader title="Customer Details" back="/admin/customers">
        <Link href={`/admin/users/${u.id}?back=${encodeURIComponent(`/admin/customers/${u.id}`)}`} className="inline-flex h-9 items-center rounded-full px-4 text-sm font-bold shadow-[0_0_0_1px_rgba(145,158,171,0.32)] hover:bg-[#f9fafb]">Edit</Link>
      </ModuleHeader>
      <Section>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#efd6fc] text-lg font-bold text-[#850cbd]">{u.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>
          <div className="flex-1">
            <p className="text-lg font-bold">{u.name}</p>
            <p className="text-sm text-[#495057]">{u.email}{u.phone ? ` · 0${u.phone.slice(3)}` : ""} · joined {fmtDate(u.createdAt)}</p>
          </div>
          <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge>
        </div>
      </Section>
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Orders" value={u.orders.length} bg="rgba(146,189,245,0.6)" icon={<ICart className="h-6 w-6" />} />
        <Tile label="Total spent" value={kes(spent)} bg="rgba(158,232,114,0.6)" icon={<ITransaction className="h-6 w-6" />} />
        <Tile label="Reviews" value={u.reviews.length} bg="rgba(255,235,105,0.6)" icon={<IPackage />} />
      </div>
      <Section title="Order History">
        <DataTable head={["Order", "Items", "Amount", "Payment", "Status", "Date", "Action"]} empty={!u.orders.length}>
          {u.orders.map((o) => (
            <tr key={o.id}>
              <td className="!text-[#495057]">#{o.number}</td>
              <td>{o.items.reduce((a, i) => a + i.qty, 0)} pcs</td>
              <td className="whitespace-nowrap">{kes(o.total)}</td>
              <td><PayOutline status={o.paymentStatus} /></td>
              <td><OrderBadge status={o.status} /></td>
              <td className="whitespace-nowrap">{fmtDate(o.createdAt)}</td>
              <td><IconLink href={`/admin/orders/${o.id}`} kind="view" label="View order" /></td>
            </tr>
          ))}
        </DataTable>
      </Section>
    </div>
  );
}
