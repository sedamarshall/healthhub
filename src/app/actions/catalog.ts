"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { cardInclude, reviveProducts, TAGS, visible } from "@/lib/catalog";

const load = unstable_cache(
  async (slug: string) => {
    const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!cat) return [];
    return prisma.product.findMany({
      where: { ...visible, stockStatus: { not: "out_of_stock" }, images: { some: {} }, categories: { some: { categoryId: cat.id } } },
      include: cardInclude,
      orderBy: { stockQty: "desc" },
      take: 12,
    });
  },
  ["home-tab"],
  { tags: [TAGS.catalog], revalidate: 300 },
);

/** Products for a home-page "Our Products" tab, loaded when the shopper clicks the tab. */
export async function loadTabProducts(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return [];
  return reviveProducts(await load(slug));
}
