import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { orderStatusLabel } from "@/lib/config";
import { isPickup } from "@/lib/mail";
import { kes } from "@/lib/utils";
import { markOrderPaid, nextStatuses, updateOrderStatus } from "../../actions";
import { ConfirmSubmit } from "../../ui/ConfirmSubmit";
import { createRefund } from "../../actions-more";
import { RxReview } from "../../prescriptions/RxReview";
import { FInput, FSelect, ModuleHeader, Section, fmtDate } from "../../ui/kit";
import { ActionForm, SaveButtons } from "../../ui/kit-client";
import { Badge, OrderBadge, PayOutline } from "../../ui/widgets";

export const metadata = { title: "Order Details" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const order = await prisma.order.findUnique({
    where: { id: Number((await params).id) },
    include: {
      items: { include: { product: { select: { slug: true, id: true, images: { take: 1, orderBy: { position: "asc" } } } } } },
      payments: { orderBy: { id: "desc" } },
      refunds: { orderBy: { id: "desc" } },
      prescription: true,
      user: true,
    },
  });
  if (!order) notFound();
  const pickup = isPickup(order);
  const next = await nextStatuses(order.status);
  const canMarkPaid = order.status === "pending_payment" && order.paymentStatus !== "paid";
  const refundedSoFar = order.refunds.filter((r) => r.status !== "rejected").reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-6">
      <ModuleHeader title={`Order #${order.number}`} back="/admin/orders">
        {next.length > 0 && (
          <form action={updateOrderStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={order.id} />
            <select name="status" defaultValue={next[0]} aria-label="Move order to" className="h-9 rounded-full bg-[#f4f6f8] px-3 text-sm outline-none">
              {next.map((st) => (
                <option key={st} value={st}>Move to: {orderStatusLabel(st, pickup)}</option>
              ))}
            </select>
            <ConfirmSubmit
              title={`Update order #${order.number}?`}
              message="The customer will get an email about this status (Out for delivery, Delivered and Cancelled send emails)."
              confirmLabel="Update"
              tone="success"
              className="inline-flex h-9 items-center rounded-full bg-[#a10fe4] px-4 text-sm font-bold text-white hover:bg-[#850cbd]"
            >
              Update
            </ConfirmSubmit>
          </form>
        )}
      </ModuleHeader>

      <div className="flex flex-wrap items-center gap-2 text-sm text-[#495057]">
        Placed {order.createdAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
        <OrderBadge status={order.status} />
        <PayOutline status={order.paymentStatus} />
        {order.couponCode && <Badge tone="info">Coupon {order.couponCode}</Badge>}
      </div>

      {canMarkPaid && (
        <Section title="Payment received another way?">
          <form action={markOrderPaid} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input type="hidden" name="id" value={order.id} />
            <p className="flex-1 text-sm text-[#495057]">If the customer paid by phone, M-Pesa till or cash, record it here. The order moves to <b>Processing</b> and the customer gets a payment email.</p>
            <input name="receipt" placeholder="Receipt / M-Pesa code (optional)" aria-label="Receipt or M-Pesa code" className="h-10 rounded-full border border-[rgba(145,158,171,0.32)] bg-transparent px-4 text-sm outline-none focus:border-[#a10fe4] sm:w-64" />
            <ConfirmSubmit title={`Mark order #${order.number} as paid?`} message={`Only do this once you've received ${kes(order.total)}. The order moves to Processing and stock is deducted.`} confirmLabel="Mark as paid" tone="success" className="inline-flex h-10 items-center justify-center rounded-full bg-[#a10fe4] px-5 text-sm font-bold text-white hover:bg-[#850cbd]">
              Mark as paid
            </ConfirmSubmit>
          </form>
        </Section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {order.prescription && (
            <Section title="Prescription" className="!border-[#ffe16a]">
              <p className="text-sm">
                <a href={`/api/admin/prescriptions/${order.prescription.id}`} target="_blank" className="font-semibold text-[#a10fe4] underline">Open uploaded file</a>
                <span className="text-[#919eab]"> ({order.prescription.originalName})</span>
              </p>
              <p className="mt-1 text-sm text-[#495057]">
                Status: <b>{order.prescription.status}</b>
                {order.prescription.reviewedBy ? ` by ${order.prescription.reviewedBy}` : ""}
                {order.prescription.note ? `: “${order.prescription.note}”` : ""}
              </p>
              {order.rxStatus === "pending" && <RxReview orderId={order.id} />}
            </Section>
          )}

          <Section title="Items">
            <ul className="divide-y divide-[rgba(145,158,171,0.2)]">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.product?.images[0] ? <img src={i.product.images[0].url} alt="" className="h-10 w-10 rounded-lg bg-[#f9fafb] object-contain" /> : <span className="h-10 w-10 rounded-lg bg-[#f4f6f8]" />}
                  <div className="min-w-0 flex-1">
                    {i.product ? <Link href={`/admin/products/${i.product.id}`} className="font-medium hover:text-[#a10fe4]">{i.name}</Link> : <span className="font-medium">{i.name}</span>}
                    <p className="text-xs text-[#919eab]">{i.sku}{i.rxClass === "pom" ? " · Rx" : ""}</p>
                  </div>
                  <span className="text-[#495057]">{kes(i.price)} × {i.qty}</span>
                  <span className="w-24 text-right font-semibold">{kes(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-[rgba(145,158,171,0.2)] pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-[#495057]">Subtotal</dt><dd>{kes(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-[#495057]">Discount ({order.couponCode})</dt><dd className="text-[#cb0233]">−{kes(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[#495057]">Delivery</dt><dd>{order.deliveryFee ? kes(order.deliveryFee) : "Free"}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{kes(order.total)}</dd></div>
            </dl>
          </Section>

          <Section title="Payments">
            {order.payments.length === 0 ? (
              <p className="text-sm text-[#919eab]">No payment attempts yet.</p>
            ) : (
              <ul className="divide-y divide-[rgba(145,158,171,0.2)] text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span>{p.provider === "ipay" ? "iPay" : p.provider === "manual" ? "Recorded manually" : p.provider === "mpesa" ? "M-Pesa" : "Card"}{p.phone ? ` · 0${p.phone.slice(3)}` : ""} · {p.createdAt.toLocaleString("en-KE")}</span>
                    <span className="flex items-center gap-2">
                      {p.receipt && <span className="text-xs text-[#495057]">{p.receipt}</span>}
                      <Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "warning"}>{p.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Return & Refund">
            {order.refunds.length > 0 && (
              <ul className="mb-4 divide-y divide-[rgba(145,158,171,0.2)] text-sm">
                {order.refunds.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span>{kes(r.amount)} · {r.reason} · {fmtDate(r.createdAt)}</span>
                    <Badge tone={r.status === "refunded" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {order.paymentStatus === "paid" && refundedSoFar < order.total ? (
              <ActionForm action={createRefund} className="space-y-4">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <FInput label={`Amount (max ${order.total - refundedSoFar})`} name="amount" type="number" min={1} max={order.total - refundedSoFar} required />
                  <FSelect label="Refund method" name="method" defaultValue="ipay">
                    <option value="ipay">iPay (M-Pesa / card)</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </FSelect>
                  <FInput label="Reason" name="reason" required />
                </div>
                <SaveButtons saveLabel="Record refund request" />
              </ActionForm>
            ) : (
              <p className="text-sm text-[#919eab]">{order.paymentStatus === "paid" ? "Fully refunded." : "Refunds are available once the order is paid."}</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Customer">
            <div className="space-y-1 text-sm">
              <p className="font-medium">{order.name}</p>
              <p><a className="text-[#a10fe4]" href={`tel:+${order.phone}`}>0{order.phone.slice(3)}</a></p>
              <p><a className="text-[#a10fe4]" href={`mailto:${order.email}`}>{order.email}</a></p>
              <p className="text-[#919eab]">{order.user ? <Link href={`/admin/customers/${order.user.id}`} className="hover:text-[#a10fe4]">Registered customer</Link> : "Guest checkout"}</p>
            </div>
          </Section>
          <Section title="Delivery">
            <div className="space-y-1 text-sm">
              <p className="font-medium">{order.deliveryZone}</p>
              <p className="text-[#495057]">{order.address}, {order.town}{order.county !== "-" ? `, ${order.county}` : ""}</p>
              {order.addressType && <p className="text-[#495057]">{order.addressType}</p>}
              {order.deliverySlot && <p className="text-[#495057]">Preferred time: {order.deliverySlot}</p>}
              {order.notes && <p className="mt-2 rounded-xl bg-[#f9fafb] p-3">Note: {order.notes}</p>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
