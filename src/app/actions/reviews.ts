"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { refreshRating } from "@/lib/reviews";

export type ReviewState = { error?: string; ok?: string };

const schema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5),
  comment: z.string().trim().min(5, "Write a short review (at least 5 characters)").max(1000),
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.string().trim().email("Enter a valid email"),
});

/**
 * Anyone can review. Reviews from signed-in customers who bought the product are published
 * straight away and marked "Verified purchase"; others wait for approval in Admin → Product Review.
 */
export async function submitReview(_p: ReviewState, f: FormData): Promise<ReviewState> {
  const parsed = schema.safeParse(Object.fromEntries(f.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const s = await getSession();
  const product = await prisma.product.findUnique({ where: { id: d.productId }, select: { id: true, slug: true } });
  if (!product) return { error: "Product not found" };

  const email = d.email.toLowerCase();
  const dup = await prisma.review.findFirst({ where: { productId: d.productId, OR: [{ email }, ...(s ? [{ userId: s.uid }] : [])] } });
  if (dup) return { error: "You've already reviewed this product." };

  const bought = await prisma.orderItem.count({
    where: { productId: d.productId, order: { paymentStatus: "paid", OR: [{ email }, ...(s ? [{ userId: s.uid }] : [])] } },
  });
  const verified = bought > 0;
  const autoPublish = verified && !!s;
  await prisma.review.create({
    data: { productId: d.productId, userId: s?.uid ?? null, name: d.name, email, rating: d.rating, comment: d.comment, verified, status: autoPublish ? "published" : "pending" },
  });
  if (autoPublish) await refreshRating(d.productId);
  revalidatePath(`/p/${product.slug}`);
  return { ok: autoPublish ? "Thanks! Your review is now live." : "Thanks! Your review will appear once our team has checked it." };
}
