import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { cardInclude, searchScore, searchWhere, SORTS, visible, withStockFirst } from "@/lib/catalog";
import { canPurchase } from "@/lib/utils";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs, Pagination, SortBar } from "@/components/Listing";
import { SearchBox } from "@/components/SearchBox";
import { ShopSidebar, listingFilters } from "@/components/ShopSidebar";

const PER_PAGE = 24;
type Props = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Shop all products", robots: { index: !q } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  let where = { ...(q ? searchWhere(q) : visible), ...listingFilters(sp) };
  // Nothing by name/brand? Try category names too ("baby food" finds the Baby & Mum range).
  if (q && !(await prisma.product.count({ where }))) where = { ...searchWhere(q, { categories: true }), ...listingFilters(sp) };
  let total: number;
  let products: Awaited<ReturnType<typeof prisma.product.findMany<{ include: typeof cardInclude }>>>;
  if (q && !sp.sort) {
    // Search with the default sort: best matches first (same ranking as the search window).
    const all = await prisma.product.findMany({ where, select: { id: true, name: true, brand: true, featured: true, status: true, stockStatus: true, stockQty: true, price: true }, take: 2000 });
    const ranked = all.map((p) => ({ id: p.id, s: searchScore(p, q) + (canPurchase(p) ? 25 : 0) + (p.featured ? 3 : 0) })).sort((a, b) => b.s - a.s);
    total = ranked.length;
    const ids = ranked.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((r) => r.id);
    const rows = await prisma.product.findMany({ where: { id: { in: ids } }, include: cardInclude });
    products = ids.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
  } else {
    [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, include: cardInclude, orderBy: withStockFirst(SORTS[sp.sort ?? "popular"] ?? SORTS.popular), skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    ]);
  }
  const params = { q: q || undefined, sort: sp.sort, instock: sp.instock, minp: sp.minp, maxp: sp.maxp };

  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: q ? "Search" : "Shop" }]} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="hidden lg:block"><ShopSidebar base="/search" params={params} /></div>
        <div className="min-w-0">
          <h1 className="section-title mb-4">{q ? <>Results for “{q}”</> : "Shop All Products"}</h1>
          <div className="mb-6 max-w-xl md:hidden"><SearchBox initial={q} /></div>
          <SortBar base="/search" params={params} total={total} shown={products.length} />
          {products.length ? (
            <ProductGrid products={products} cols="md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
          ) : (
            <div className="rounded-2xl border border-line p-10 text-center">
              <p className="font-heading text-lg font-bold">No products found</p>
              <p className="mt-1 text-sm text-muted">Try a different spelling or a shorter search, such as a brand name.</p>
            </div>
          )}
          <Pagination base="/search" params={params} page={page} pages={Math.ceil(total / PER_PAGE)} />
        </div>
      </div>
    </div>
  );
}
