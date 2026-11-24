import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canPayOrder } from "@/lib/orders";
import { orderStatusLabel, orderSteps } from "@/lib/config";
import { isPickup } from "@/lib/mail";
import { kes } from "@/lib/utils";
import { getSettings, paymentMethods } from "@/lib/settings";
import { PaymentPanel } from "@/components/PaymentPanel";
import { Breadcrumbs } from "@/components/Listing";
import { MessageForm } from "@/components/MessageForm";
import { RecentlyViewed } from "@/components/RecentlyViewed";

export const metadata: Metadata = { title: "Your Order", robots: { index: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; pay?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { t, pay } = await searchParams;
  const [order, session, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { number },
      include: { items: { include: { product: { select: { slug: true, images: { take: 1, orderBy: { position: "asc" } } } } } }, prescription: true, payments: { orderBy: { id: "desc" }, take: 1 } },
    }),
    getSession(),
    getSettings(),
  ]);
  const methods = await paymentMethods();
  if (!order || (order.accessToken !== t && (!session || (session.uid !== order.userId && session.role === "customer")))) notFound();

  const pickup = isPickup(order);
  const steps = orderSteps(order.rxStatus !== "not_required");
  const current = steps.indexOf(order.status === "paid" ? "processing" : order.status);
  const lastPayment = order.payments[0];
  const paid = order.paymentStatus === "paid";
  const payable = canPayOrder(order);

  const banner =
    order.status === "cancelled"
      ? { title: "This order was cancelled", text: order.rxStatus === "rejected" ? order.rxNote || "Our pharmacist could not approve the prescription." : "Contact us if you have any questions.", tone: "bg-[rgba(255,72,66,0.08)]" }
      : order.status === "awaiting_rx"
        ? { title: "Thanks For Your Order", text: "Our pharmacist is reviewing your prescription. We'll email you when it's approved so you can pay. Keep this page to come back to it.", tone: "bg-accent-soft" }
        : paid
          ? { title: "Thanks For Your Order", text: `We've received your payment${lastPayment?.receipt ? ` (receipt ${lastPayment.receipt})` : ""} and your order is now being processed.`, tone: "bg-brand-50" }
          : { title: "Thanks For Your Order", text: "We've received your order. Complete payment below to confirm it.", tone: "bg-brand-50" };

  const box = "overflow-hidden rounded-2xl border border-line";
  const head = "bg-well px-6 py-4 font-heading text-xl font-bold";

  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: paid ? "Order Successful" : "Your Order" }]} />

      <div className={`mb-6 rounded-3xl px-6 py-10 text-center ${banner.tone}`}>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {order.status === "cancelled" ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="m5 12.5 4.5 4.5L19 7.5" />}
          </svg>
        </span>
        <h1 className="mt-4 font-heading text-3xl font-bold text-ink">{banner.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{banner.text}</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-brand-600 px-8 font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700">Back To Home</Link>
      </div>

      {order.status !== "cancelled" && (
        <ol className="scrollbar-none mb-6 flex gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <li key={s} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${i <= current ? "bg-brand-600 text-white" : "bg-well text-muted"}`}>
              {i + 1}. {orderStatusLabel(s, pickup)}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {payable && !methods.ipay && (
            <p className="rounded-2xl border border-line bg-accent-soft p-5 text-[15px]">Online payment is temporarily unavailable. Please call us on {settings.phone} to complete your order.</p>
          )}
          {payable && methods.ipay && (
            <PaymentPanel number={order.number} token={order.accessToken} total={kes(order.total)} awaiting={order.paymentStatus === "pending"} autoStart={pay === "ipay" && order.paymentStatus === "unpaid"} />
          )}

          <section className={box}>
            <h2 className={head}>Order Details</h2>
            <dl className="grid gap-5 p-6 sm:grid-cols-2">
              <div><dt className="text-sm text-muted">Order ID</dt><dd className="mt-1 font-semibold text-ink">#{order.number}</dd></div>
              <div><dt className="text-sm text-muted">Order status</dt><dd className="mt-1 font-semibold text-brand-600">{orderStatusLabel(order.status, pickup)}</dd></div>
              <div><dt className="text-sm text-muted">Amount Payable</dt><dd className="mt-1 font-semibold text-ink">{kes(order.total)} <span className={paid ? "text-brand-600" : "text-sale"}>({paid ? "Paid" : "Unpaid"})</span></dd></div>
              <div><dt className="text-sm text-muted">Order Date</dt><dd className="mt-1 font-semibold text-ink">{order.createdAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            </dl>
          </section>

          <section className={box}>
            <h2 className={head}>Shipment Address</h2>
            <div className="space-y-1 p-6 text-muted">
              <p className="font-semibold text-ink">{order.name}</p>
              <p>0{order.phone.slice(3)}</p>
              <p>{order.email}</p>
              <p>{order.address}{order.town ? `, ${order.town}` : ""}{order.county !== "-" ? `, ${order.county}` : ""}</p>
              <p className="pt-2 font-semibold text-ink">{order.deliveryZone}{order.deliveryFee === 0 ? " · Free Delivery" : ""}</p>
              {order.deliverySlot && <p>Preferred time: {order.deliverySlot}</p>}
            </div>
          </section>

          {(paid || order.status === "delivered") && (
            <section className={box}>
              <h2 className={head}>Give us feedback</h2>
              <div className="p-6"><MessageForm kind="feedback" orderId={order.id} defaults={{ name: order.name, email: order.email }} /></div>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-6">
          <section className="rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="mb-4 font-heading text-xl font-bold">Cart Items</h2>
            <ul className="space-y-3">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f3f5]">
                    {i.product?.images[0] && <Image src={i.product.images[0].url} alt="" fill sizes="56px" className="object-contain p-1 mix-blend-multiply" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {i.product ? <Link href={`/p/${i.product.slug}`} className="line-clamp-1 text-sm font-semibold hover:text-brand-600">{i.name}</Link> : <p className="line-clamp-1 text-sm font-semibold">{i.name}</p>}
                    <p className="text-sm text-muted">{i.qty} x {i.rxClass === "pom" ? "Rx · " : ""}{kes(i.price)}</p>
                  </div>
                  <span className="text-sm font-semibold text-brand-600">{kes(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line p-5 sm:p-6">
            <h2 className="mb-4 font-heading text-xl font-bold">Order Summary</h2>
            <dl className="space-y-3 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Sub-Total</dt><dd className="font-semibold">{kes(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount ({order.couponCode})</dt><dd className="font-semibold text-sale">−{kes(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipment</dt><dd className="font-semibold">{order.deliveryFee ? kes(order.deliveryFee) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-lg font-bold"><dt>Total</dt><dd>{kes(order.total)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <RecentlyViewed />
    </div>
  );
}
