import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const cardInclude = {
  images: { orderBy: { position: "asc" }, take: 1 },
  categories: { take: 1, orderBy: { categoryId: "desc" }, include: { category: { select: { name: true, slug: true } } } },
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export const visible: Prisma.ProductWhereInput = { status: "active" };

/** Cache tags: admin saves call revalidateTag() with these so the shop updates immediately. */
export const TAGS = { catalog: "catalog", settings: "settings" } as const;

export const getNav = cache(
  unstable_cache(
    async () =>
      prisma.category.findMany({
        where: { parentId: null, isActive: true },
        orderBy: { position: "asc" },
        include: { children: { where: { isActive: true }, orderBy: { position: "asc" } } },
      }),
    ["nav"],
    { tags: [TAGS.catalog], revalidate: 3600 },
  ),
);

/** unstable_cache stores JSON, so Date fields come back as strings; turn them back into Dates. */
export function reviveProducts<T extends { createdAt: Date | string; updatedAt: Date | string; saleStartsAt: Date | string | null; saleEndsAt: Date | string | null }>(list: T[]): T[] {
  const d = (v: Date | string | null) => (v === null ? null : v instanceof Date ? v : new Date(v));
  return list.map((p) => ({ ...p, createdAt: d(p.createdAt)!, updatedAt: d(p.updatedAt)!, saleStartsAt: d(p.saleStartsAt), saleEndsAt: d(p.saleEndsAt) }));
}

export function searchWhere(q: string): Prisma.ProductWhereInput {
  const terms = q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return {
    ...visible,
    AND: terms.map((t) => ({
      OR: [{ name: { contains: t } }, { brand: { contains: t } }, { sku: { contains: t } }, { legacyCode: { equals: t } }],
    })),
  };
}

export const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  popular: [{ featured: "desc" }, { stockQty: "desc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  name: [{ name: "asc" }],
};

/** In-stock / special-order products first, then out of stock. */
export function withStockFirst(order: Prisma.ProductOrderByWithRelationInput[]) {
  return [{ stockStatus: "asc" } as Prisma.ProductOrderByWithRelationInput, ...order];
}

export type DirectoryCategory = { id: number; name: string; slug: string; parentId: number | null; topId: number; depth: number; position: number; count: number; image: string | null };

/**
 * Every active category with its product count, top-level group and a picture (the best-stocked product in it).
 * Used by the "All Categories" page; cached and refreshed with the catalog.
 */
export const getCategoryDirectory = cache(
  unstable_cache(
    async (): Promise<DirectoryCategory[]> => {
      const cats = await prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, parentId: true, position: true } });
      const counts = await prisma.productCategory.groupBy({ by: ["categoryId"], where: { product: visible }, _count: { _all: true } });
      const countOf = new Map(counts.map((c) => [c.categoryId, c._count._all]));
      const byId = new Map(cats.map((c) => [c.id, c]));
      const top = (id: number): [number, number] => {
        let c = byId.get(id)!, depth = 0;
        while (c.parentId && byId.has(c.parentId) && depth < 10) { c = byId.get(c.parentId)!; depth++; }
        return [c.id, depth];
      };
      const withCounts = cats.filter((c) => (countOf.get(c.id) ?? 0) > 0);
      const images = await Promise.all(
        withCounts.map((c) =>
          prisma.product.findFirst({
            where: { ...visible, stockStatus: { not: "out_of_stock" }, images: { some: {} }, categories: { some: { categoryId: c.id } } },
            orderBy: { stockQty: "desc" },
            select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
          }),
        ),
      );
      return withCounts.map((c, i) => {
        const [topId, depth] = top(c.id);
        return { ...c, topId, depth, count: countOf.get(c.id) ?? 0, image: images[i]?.images[0]?.url ?? null };
      });
    },
    ["category-directory"],
    { tags: [TAGS.catalog], revalidate: 3600 },
  ),
);
