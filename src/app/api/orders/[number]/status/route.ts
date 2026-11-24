import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await prisma.order.findUnique({ where: { number }, select: { id: true, accessToken: true, userId: true, status: true, paymentStatus: true } });
  const session = await getSession();
  if (!order || (order.accessToken !== req.nextUrl.searchParams.get("t") && session?.uid !== order.userId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ref = req.nextUrl.searchParams.get("ref");
  const payment = ref ? await prisma.payment.findFirst({ where: { reference: ref, orderId: order.id } }) : null;
  return NextResponse.json({ status: order.status, paymentStatus: order.paymentStatus, payment: payment?.status, message: payment?.message });
}
