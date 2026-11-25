import { NextResponse, type NextRequest } from "next/server";
import { linkGuestOrders } from "@/lib/link-orders";

/** Target of the "Add them to my account" email link. */
export async function GET(req: NextRequest) {
  const n = await linkGuestOrders(req.nextUrl.searchParams.get("t") ?? "");
  const to = new URL(n === null ? "/account?linked=invalid" : `/account?tab=orders&linked=${n}`, req.nextUrl.origin);
  return NextResponse.redirect(to);
}
