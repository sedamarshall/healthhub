import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { searchWhere } from "@/lib/catalog";
import { effectivePrice, kes } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json([]);
  const products = await prisma.product.findMany({
    where: searchWhere(q),
    orderBy: [{ stockStatus: "asc" }, { featured: "desc" }, { name: "asc" }],
    take: 8,
    include: { images: { take: 1, orderBy: { position: "asc" } } },
  });
  return NextResponse.json(products.map((p) => ({ slug: p.slug, name: p.name, price: kes(effectivePrice(p)), image: p.images[0]?.url })));
}
