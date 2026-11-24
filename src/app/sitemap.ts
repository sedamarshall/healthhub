import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { STORE } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: "active" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);
  return [
    { url: STORE.appUrl, changeFrequency: "daily", priority: 1 },
    ...["about-us", "contact", "faq", "privacy-policy", "terms", "search"].map((p) => ({ url: `${STORE.appUrl}/${p}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...categories.map((c) => ({ url: `${STORE.appUrl}/c/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${STORE.appUrl}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
