import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { cardInclude, SORTS, visible, withStockFirst } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs, Pagination, SortBar } from "@/components/Listing";
import { ShopSidebar, listingFilters } from "@/components/ShopSidebar";

const PER_PAGE = 24;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

async function load(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { parent: { include: { parent: { include: { parent: true } } } }, children: { where: { isActive: true }, orderBy: { position: "asc" } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return { title: c.name, description: `Shop ${c.name} online at Health Hub Chemist. Genuine products, fast delivery, pay with M-Pesa.`, alternates: { canonical: `/c/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await load(slug);
  if (!cat || !cat.isActive) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...visible, categories: { some: { categoryId: cat.id } }, ...listingFilters(sp) };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: cardInclude, orderBy: withStockFirst(SORTS[sp.sort ?? "popular"] ?? SORTS.popular), skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);
  const trail = [cat.parent?.parent?.parent, cat.parent?.parent, cat.parent]
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ name: c.name, href: `/c/${c.slug}` }));
  const params2 = { sort: sp.sort, instock: sp.instock, minp: sp.minp, maxp: sp.maxp };

  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, ...trail, { name: cat.name }]} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="hidden lg:block"><ShopSidebar base={`/c/${cat.slug}`} params={params2} activeSlug={cat.slug} /></div>
        <div className="min-w-0">
          <h1 className="section-title mb-4">{cat.name}</h1>
          {cat.children.length > 0 && (
            <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {cat.children.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-brand-600 hover:text-brand-600">{c.name}</Link>
              ))}
            </div>
          )}
          <SortBar base={`/c/${cat.slug}`} params={params2} total={total} shown={products.length} />
          {products.length ? <ProductGrid products={products} cols="md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" /> : <p className="rounded-2xl border border-line p-10 text-center text-muted">No products match these filters.</p>}
          <Pagination base={`/c/${cat.slug}`} params={params2} page={page} pages={Math.ceil(total / PER_PAGE)} />
        </div>
      </div>
    </div>
  );
}
