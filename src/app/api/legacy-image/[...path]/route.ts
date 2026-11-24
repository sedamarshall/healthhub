import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/** Old image URLs (/image/catalog/...) → 301 to the re-hosted copy, so Google Images links keep working. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  // Rebuild the original URL in the same encoding the scrape used (spaces as %20, other chars as-is).
  const decoded = path.map((s) => decodeURIComponent(s)).join("/");
  const candidates = [
    `https://healthhub.ke/image/${decoded.split("/").map((s) => s.replace(/ /g, "%20")).join("/")}`,
    `https://healthhub.ke/image/${path.join("/")}`,
  ];
  const img = await prisma.productImage.findFirst({ where: { originalUrl: { in: candidates } }, select: { url: true } });
  if (img && img.url.startsWith("/")) return NextResponse.redirect(new URL(img.url, req.nextUrl.origin), 301);
  return new NextResponse("Not found", { status: 404 });
}
