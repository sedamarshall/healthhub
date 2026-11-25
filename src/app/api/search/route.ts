import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCategoryDirectory, searchScore, searchWhere, visible } from "@/lib/catalog";
import { canPurchase, effectivePrice } from "@/lib/utils";

/** Terms shown as "Popular searches" before the shopper types. */
const POPULAR_SEARCHES = ["Panadol", "Vitamin C", "Multivitamin", "Sunscreen", "Face mask", "Hand sanitizer", "Blood pressure monitor", "Diabetes test strips", "Baby formula", "Cough syrup"];

const include = {
  images: { take: 1, orderBy: { position: "asc" as const }, select: { url: true } },
  categories: { take: 1, orderBy: { categoryId: "desc" as const }, select: { category: { select: { name: true, slug: true } } } },
} satisfies Prisma.ProductInclude;
type Row = Prisma.ProductGetPayload<{ include: typeof include }>;

/** Compact product for the search window. */
const card = (p: Row) => {
  const price = effectivePrice(p);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.categories[0]?.category.name ?? null,
    categorySlug: p.categories[0]?.category.slug ?? null,
    price,
    was: price < p.price ? p.price : null,
    image: p.images[0]?.url ?? null,
    available: canPurchase(p),
    rx: p.rxClass === "pom",
  };
};
export type SearchCard = ReturnType<typeof card>;

/**
 * Live search for the header search window.
 *   ?q=panadol      → { total, items }   (in-stock first, up to 30)
 *   (no q)          → { popularSearches, categories, products }   (what to show before typing)
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const headers = { "Cache-Control": q ? "private, max-age=30" : "public, max-age=300" };

  if (q.length < 2) {
    const [products, cats] = await Promise.all([
      prisma.product.findMany({ where: { ...visible, featured: true, stockStatus: "in_stock", stockQty: { gt: 0 }, images: { some: {} } }, include, orderBy: { stockQty: "desc" }, take: 60 }),
      getCategoryDirectory(),
    ]);
    const categories = cats.filter((c) => c.depth === 0 && c.image).sort((a, b) => b.count - a.count).slice(0, 6).map((c) => ({ name: c.name, slug: c.slug, image: c.image, count: c.count }));
    // One product per category, so the list shows the range (not six of the same thing).
    const seen = new Set<string>();
    const picks = products.filter((p) => { const c = p.categories[0]?.category.slug ?? String(p.id); if (seen.has(c)) return false; seen.add(c); return true; }).slice(0, 6);
    return NextResponse.json({ popularSearches: POPULAR_SEARCHES, categories, products: picks.map(card) }, { headers });
  }

  // Match by name/brand/SKU; only if that finds nothing, also match category names.
  let where = searchWhere(q);
  let total = await prisma.product.count({ where });
  if (!total) {
    where = searchWhere(q, { categories: true });
    total = await prisma.product.count({ where });
  }
  const rows = total ? await prisma.product.findMany({ where, include, take: 300 }) : [];
  // Best matches first ("Vitamin C ..." before "... with vitamin C"), things you can buy before out of stock.
  const items = rows
    .map((p) => ({ p, score: searchScore(p, q) + (canPurchase(p) ? 25 : 0) + (p.featured ? 3 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(({ p }) => card(p));
  return NextResponse.json({ total, items }, { headers });
}
