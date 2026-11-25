import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { IPAY, ipaySimulated, verifyWithIpn } from "@/lib/ipay";
import { markPaymentFailed, markPaymentPaid } from "@/lib/orders";

/**
 * iPay sends the customer back here after paying (cbk). The query string is not trusted on its own:
 * we ask iPay's IPN endpoint for the real status before marking the order paid.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const reference = q.get("ivm") ?? ""; // our invoice = Payment.reference
  const payment = reference ? await prisma.payment.findUnique({ where: { reference }, include: { order: true } }) : null;
  if (!payment) return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  const back = new URL(`/order/${encodeURIComponent(payment.order.number)}?t=${encodeURIComponent(payment.order.accessToken)}`, req.nextUrl.origin);

  // Development stand-in (no iPay keys, never in production).
  if (ipaySimulated() && q.get("simulated")) {
    if (q.get("simulated") === "1") await markPaymentPaid(reference, { amount: payment.amount, message: "Simulated iPay payment" });
    else await markPaymentFailed(reference, "Payment cancelled");
    return NextResponse.redirect(back);
  }

  let status = "";
  try {
    status = await verifyWithIpn(q);
  } catch {
    // iPay unreachable: leave the payment pending; the customer sees "awaiting confirmation".
    await prisma.payment.update({ where: { id: payment.id }, data: { message: "Could not reach iPay to confirm. Check iPay dashboard.", raw: JSON.stringify(Object.fromEntries(q)) } });
    return NextResponse.redirect(back);
  }

  const raw = { query: Object.fromEntries(q), ipn: status };
  const amount = Number(q.get("mc"));
  const receipt = q.get("txncd");
  if ((status === IPAY.status.success || status === IPAY.status.more) && !(Number.isFinite(amount) && amount > 0)) {
    // iPay says paid but didn't tell us how much: don't guess. Staff check the iPay dashboard and use "Mark as paid".
    await prisma.payment.update({ where: { id: payment.id }, data: { message: "iPay reported success without an amount. Check the iPay dashboard before marking paid.", raw: JSON.stringify(raw) } });
  } else if (status === IPAY.status.success || status === IPAY.status.more) {
    await markPaymentPaid(reference, { amount, receipt, message: `Paid via iPay${q.get("channel") ? ` (${q.get("channel")})` : ""}`, raw });
  } else if (status === IPAY.status.pending) {
    await prisma.payment.update({ where: { id: payment.id }, data: { message: "iPay: payment pending", raw: JSON.stringify(raw) } });
  } else {
    const why = status === IPAY.status.less ? "Amount paid was less than the order total" : status === IPAY.status.used ? "This payment code was already used" : "Payment was not completed";
    await markPaymentFailed(reference, why, raw);
  }
  return NextResponse.redirect(back);
}
