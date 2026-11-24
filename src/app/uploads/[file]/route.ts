import { readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR, UPLOAD_MIME } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = basename((await params).file);
  const type = UPLOAD_MIME[extname(name).slice(1).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(join(UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
