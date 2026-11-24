import "server-only";
import { prisma } from "./db";

/** Recompute a product's average rating and review count from its published reviews. */
export async function refreshRating(productId: number) {
  const agg = await prisma.review.aggregate({ where: { productId, status: "published" }, _avg: { rating: true }, _count: { _all: true } });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
  });
}
