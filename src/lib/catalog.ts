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
