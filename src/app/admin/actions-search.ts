"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export type PickedProduct = { sku: string; name: string; price: number; image: string | null };

/** Product search for admin pickers (flash sales, banners). */
export async function searchProductsForPicker(q: string): Promise<PickedProduct[]> {
  await requireStaff();
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const rows = await prisma.product.findMany({
    where: { status: { not: "archived" }, OR: [{ name: { contains: term } }, { sku: { contains: term.toUpperCase() } }, { brand: { contains: term } }] },
    take: 12,
    orderBy: { name: "asc" },
    select: { sku: true, name: true, price: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
  return rows.map((p) => ({ sku: p.sku, name: p.name, price: p.price, image: p.images[0]?.url ?? null }));
}
