import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { renderAny } from "@/lib/mail";

/** Raw HTML of an email template filled with sample data (shown in Admin → Settings → Email). */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const s = await getSession();
  if (!s || s.role === "customer") return new NextResponse("Not allowed", { status: 403 });
  const r = await renderAny((await params).key);
  if (!r) return new NextResponse("Unknown template", { status: 404 });
  return new NextResponse(r.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN" } });
}
