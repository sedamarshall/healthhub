import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { cardInclude, searchWhere, SORTS, visible, withStockFirst } from "@/lib/catalog";
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
  const where = { ...(q ? searchWhere(q) : visible), ...listingFilters(sp) };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: cardInclude, orderBy: withStockFirst(SORTS[sp.sort ?? "popular"] ?? SORTS.popular), skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);
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
