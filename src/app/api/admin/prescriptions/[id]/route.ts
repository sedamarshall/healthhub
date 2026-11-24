import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Prescriptions are private: only pharmacists/admins can open them. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || (s.role !== "admin" && s.role !== "pharmacist")) return new NextResponse("Forbidden", { status: 403 });
  const rx = await prisma.prescription.findUnique({ where: { id: Number((await params).id) } });
  if (!rx) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(join(process.cwd(), "storage", "prescriptions", basename(rx.filePath)));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": rx.mimeType, "Content-Disposition": `inline; filename="prescription-${rx.orderId}"`, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
