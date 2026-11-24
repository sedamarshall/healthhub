/**
 * Copies the home page's built-in hero slides and promo banners into Home Page Control
 * (only if there are no blocks yet), so they can be edited in the admin.
 * Run: npx tsx scripts/seed-home-blocks.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** First product photo in a category (featured first), so each block starts with a relevant image. */
async function photo(categorySlug: string): Promise<string | null> {
  const p = await prisma.product.findFirst({
    where: { status: "active", categories: { some: { category: { slug: categorySlug } } }, images: { some: {} } },
    orderBy: [{ featured: "desc" }, { ratingCount: "desc" }],
    select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
  return p?.images[0]?.url ?? null;
}

(async () => {
  if (await prisma.homeBlock.count()) return console.log("Home blocks already exist. Nothing to do.");
  const blocks = [
    { name: "Hero: Genuine medicines", slug: "hero-genuine-medicines", type: "hero", tag: "Genuine medicines", badge: "Delivered", title: "Everything you need for wellness in one place.", text: "Over 4,000 medicines, vitamins, baby, skin and personal care products, delivered across Kenya.", href: "/search", ctaLabel: "Shop Now", image: await photo("skin-care") },
    { name: "Hero: Vitamins", slug: "hero-vitamins", type: "hero", tag: "Vitamins & supplements", badge: "Top brands", title: "Boost your health with trusted supplements.", text: "Daily vitamins, immunity boosters and sports nutrition from brands you know.", href: "/c/multi-vitamins", ctaLabel: "Shop Vitamins", image: await photo("multi-vitamins") },
    { name: "Hero: Skin care", slug: "hero-skin-care", type: "hero", tag: "Skin & personal care", badge: "New in", title: "Top brands for skincare, haircare and more.", text: "La Roche-Posay, Cetaphil, Aveeno and more, at great prices.", href: "/c/skin-care", ctaLabel: "Shop Skin Care", image: await photo("personal-care") },
    { name: "Hero: Health devices", slug: "hero-health-devices", type: "hero", tag: "Health devices", badge: "At home", title: "BP monitors, glucometers, thermometers & more.", text: "Check your health at home with reliable diagnostic devices.", href: "/c/medical-diagnostic", ctaLabel: "Shop Devices", image: await photo("medical-diagnostic") },
    { name: "Promo: Vitamins", slug: "promo-vitamins", type: "promo", title: "Your Health, Our Priority", text: "Vitamins for the whole family", href: "/c/multi-vitamins", bgColor: "#ffe9d6", image: await photo("multi-vitamins") },
    { name: "Promo: Mum & baby", slug: "promo-mum-baby", type: "promo", title: "Your Partner in Wellness", text: "Everything for mum & baby", href: "/c/baby-and-mum", bgColor: "#d9f3ee", image: await photo("baby-and-mum") },
    { name: "Promo: First aid", slug: "promo-first-aid", type: "promo", title: "Health Made Simple", text: "First aid essentials, ready when needed", href: "/c/first-aid", bgColor: "#e6ecff", image: await photo("first-aid") },
  ];
  await prisma.homeBlock.createMany({ data: blocks.map((b, i) => ({ ...b, position: i + 1 })) });
  console.log(`Added ${blocks.length} home blocks (4 hero slides, 3 promo banners).`);
})().finally(() => prisma.$disconnect());
