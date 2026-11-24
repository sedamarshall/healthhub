import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { kes } from "@/lib/utils";
import { reviewPrescription } from "../actions";
import { Actions, DataTable, IconAction, IconLink, ModuleHeader, Toolbar, fmtDate } from "../ui/kit";
import { AdminPagination, Badge } from "../ui/widgets";

export const metadata = { title: "Prescriptions" };
const PER = 10;

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status ?? "pending";
  const where: Prisma.PrescriptionWhereInput = {
    ...(status !== "all" ? { status } : {}),
    ...(sp.q ? { order: { OR: [{ number: { contains: sp.q } }, { name: { contains: sp.q } }] } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.prescription.count({ where }),
    prisma.prescription.findMany({ where, orderBy: { createdAt: status === "pending" ? "asc" : "desc" }, skip: (page - 1) * PER, take: PER, include: { order: { include: { items: true } } } }),
  ]);

  return (
    <div>
      <ModuleHeader title="Prescription Review" />
      <p className="-mt-3 mb-5 text-sm text-[#495057]">Orders with prescription-only medicine wait here. Approving lets the customer pay; rejecting cancels the order.</p>
      <Toolbar
        action="/admin/prescriptions"
        params={{ ...sp, status }}
        placeholder="Order no. or customer..."
        filters={[{ name: "status", label: "Status", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "all", label: "All" }] }]}
      />
      <DataTable head={["Order", "Customer", "Rx items", "Total", "Prescription", "Status", "Submitted", "Action"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td><Link href={`/admin/orders/${r.orderId}`} className="hover:text-[#a10fe4]">#{r.order.number}</Link></td>
            <td className="whitespace-nowrap">{r.order.name}<span className="block text-xs text-[#919eab]">0{r.order.phone.slice(3)}</span></td>
            <td className="max-w-[240px] truncate">{r.order.items.filter((i) => i.rxClass === "pom").map((i) => `${i.qty}× ${i.name}`).join(", ") || "-"}</td>
            <td className="whitespace-nowrap">{kes(r.order.total)}</td>
            <td><a href={`/api/admin/prescriptions/${r.id}`} target="_blank" className="font-semibold text-[#a10fe4] underline">Open file</a></td>
            <td><Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Badge>{r.reviewedBy && <span className="block text-xs text-[#919eab]">{r.reviewedBy}</span>}</td>
            <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
            <td>
              <Actions>
                <IconLink href={`/admin/orders/${r.orderId}`} kind="view" label="Open order" />
                {r.status === "pending" && (
                  <>
                    <IconAction action={reviewPrescription} kind="approve" label="Approve (customer can pay)" fields={{ orderId: r.orderId, decision: "approved" }} confirm="Approve this prescription? The customer will be able to pay." />
                    <IconAction action={reviewPrescription} kind="reject" label="Reject & cancel order" fields={{ orderId: r.orderId, decision: "rejected", note: "Prescription could not be approved" }} confirm="Reject this prescription and cancel the order? To add a note for the customer, open the order instead." />
                  </>
                )}
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/prescriptions" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
