import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { visible } from "@/lib/catalog";
import { canPurchase, effectivePrice, maxQty } from "@/lib/utils";

/** Everything the Quick View window shows, for one product (public catalogue data only). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.product.findFirst({
    where: { ...visible, slug },
    include: {
      images: { orderBy: { position: "asc" }, take: 8, select: { url: true, alt: true } },
      categories: { orderBy: { categoryId: "desc" }, select: { category: { select: { name: true, slug: true, isActive: true } } } },
      tags: { take: 8, select: { tag: { select: { name: true, slug: true } } } },
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const price = effectivePrice(p);
  const text = p.descriptionText.replace(/\s+/g, " ").trim();
  return NextResponse.json(
    {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      price,
      was: price < p.price ? p.price : null,
      saleEndsAt: price < p.price ? p.saleEndsAt : null,
      images: p.images.map((i) => i.url),
      categories: p.categories.filter((c) => c.category.isActive).map((c) => ({ name: c.category.name, slug: c.category.slug })),
      tags: p.tags.map((t) => t.tag),
      summary: text.length > 320 ? `${text.slice(0, 320).replace(/\s+\S*$/, "")}…` : text,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      available: canPurchase(p),
      stockStatus: p.stockStatus,
      stockQty: p.stockStatus === "in_stock" ? p.stockQty : null,
      max: maxQty(p),
      rx: p.rxClass === "pom",
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
