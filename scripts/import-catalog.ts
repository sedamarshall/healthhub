/**
 * Imports the scraped OpenCart catalogue (data/healthhub_products.json) into the database.
 * Safe to re-run: products/categories are upserted by their legacy id. Pass --images-only
 * to just re-link images after the downloader has fetched more of them.
 *
 *   npm run db:import
 *   npm run db:import -- --images-only
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { slugify, htmlToText } from "../src/lib/utils";
import { sanitizeHtml } from "../src/lib/sanitize";

const prisma = new PrismaClient();
const ROOT = join(__dirname, "..");
const imagesOnly = process.argv.includes("--images-only");

type RawCat = { category_id: number; path: string; name: string; parent_id: string | number; level: number };
type RawProduct = Record<string, string | number> & { product_id: number | string };

const raw = JSON.parse(readFileSync(join(ROOT, "data/healthhub_products.json"), "utf8"));
const cats: RawCat[] = raw.categories;
const products: RawProduct[] = raw.products;

const manifestPath = join(ROOT, "data/image_manifest.json");
const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

// Known issues file → flags
const issues = new Map<number, string[]>();
for (const line of readFileSync(join(ROOT, "data/healthhub_data_issues.csv"), "utf8").split(/\r?\n/).slice(1)) {
  const m = line.match(/^(\d+),/);
  if (!m) continue;
  const id = Number(m[1]);
  const issue = ["Not in any category", "Possible duplicate (same name)", "No description", "Placeholder image", "No image", "Price is 0 / missing", "Demo/test product"].find((i) => line.includes(i));
  if (issue) issues.set(id, [...(issues.get(id) ?? []), issue]);
}

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v)).trim();
const splitUrls = (v: unknown) => s(v).split(/\s*\|\s*/).map((x) => x.trim()).filter(Boolean);
// Prefer the optimised WebP copy (scripts/optimize-images.ts) when it exists
const localImage = (u: string) => {
  const local = manifest[u];
  if (!local) return u;
  const webp = local.replace(/^\/img\/p\//, "/img/w/").replace(/\.[a-z]+$/i, ".webp");
  return existsSync(join(ROOT, "public", webp)) ? webp : local;
};
const isPlaceholder = (u: string) => /placeholder\.png$/i.test(u);

async function importImages() {
  let n = 0;
  for (const p of products) {
    const product = await prisma.product.findUnique({ where: { legacyId: Number(p.product_id) }, select: { id: true, name: true } });
    if (!product) continue;
    const urls = [s(p.main_image), ...splitUrls(p.additional_images)].filter((u) => u && !isPlaceholder(u));
    const unique = [...new Set(urls)];
    await prisma.productImage.deleteMany({ where: { productId: product.id, originalUrl: { not: null } } });
    await prisma.productImage.createMany({
      data: unique.map((u, i) => ({ productId: product.id, url: localImage(u), originalUrl: u, alt: product.name, position: i })),
    });
    n += unique.length;
  }
  const local = Object.keys(manifest).length;
  console.log(`images linked: ${n} (local copies available for ${local} URLs, the rest still point at healthhub.ke)`);
}

async function main() {
  if (imagesOnly) return importImages();

  // ---- categories ----
  const byLegacy = new Map<number, number>();
  const usedSlugs = new Set<string>();
  const sorted = [...cats].sort((a, b) => a.level - b.level || a.category_id - b.category_id);
  for (const [i, c] of sorted.entries()) {
    const parentLegacy = s(c.parent_id) ? Number(c.parent_id) : null;
    const parentId = parentLegacy ? byLegacy.get(parentLegacy) ?? null : null;
    let slug = slugify(c.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${c.category_id}`;
    usedSlugs.add(slug);
    const isTest = /^test\b/i.test(c.name);
    const name = c.name.replace(/^Lozegens$/, "Lozenges");
    const row = await prisma.category.upsert({
      where: { legacyId: c.category_id },
      create: { legacyId: c.category_id, legacyPath: c.path, parentId, name, slug, position: i, isActive: !isTest },
      update: { legacyPath: c.path, parentId, name, isActive: !isTest },
    });
    byLegacy.set(c.category_id, row.id);
  }
  const catByPath = new Map(cats.map((c) => [c.path, byLegacy.get(c.category_id)!]));
  console.log(`categories: ${cats.length}`);

  // ---- products ----
  const usedProductSlugs = new Set((await prisma.product.findMany({ select: { slug: true, legacyId: true } })).filter((p) => p.legacyId === null).map((p) => p.slug));
  const dupGroups = new Map<string, number[]>();
  let flagged = 0;

  for (const p of products) {
    const legacyId = Number(p.product_id);
    const name = s(p.name);
    const flags = issues.get(legacyId) ?? [];
    let slug = slugify(name);
    if (usedProductSlugs.has(slug)) slug = `${slug}-${legacyId}`;
    usedProductSlugs.add(slug);

    const price = Math.round(Number(s(p.regular_price)) || 0);
    const sale = Math.round(Number(s(p.sale_price)) || 0);
    const qtyRaw = s(p.stock_qty);
    const availability = s(p.availability);
    const stockQty = /^\d+$/.test(qtyRaw) ? Number(qtyRaw) : 0;
    const stockStatus = /2-3 days/i.test(availability) ? "special_order" : stockQty > 0 ? "in_stock" : "out_of_stock";
    const descriptionHtml = sanitizeHtml(s(p.description_html));
    const descriptionText = s(p.description_text) || htmlToText(descriptionHtml);

    const isDemo = flags.includes("Demo/test product");
    const zeroPrice = price <= 0;
    const status = isDemo ? "archived" : zeroPrice ? "draft" : "active";
    const reviewNotes = flags;
    const needsReview = reviewNotes.length > 0;
    if (needsReview) flagged++;

    const data = {
      sku: `HH${String(legacyId).padStart(5, "0")}`,
      legacyCode: s(p.product_code) || null,
      name,
      brand: s(p.brand) || null,
      descriptionHtml,
      descriptionText,
      price,
      salePrice: sale > 0 && sale < price ? sale : null,
      stockQty,
      stockStatus,
      status,
      metaTitle: s(p.meta_title) || null,
      metaDescription: s(p.meta_description) || (descriptionText ? descriptionText.slice(0, 155) : null),
      needsReview,
      reviewNote: reviewNotes.join("; ") || null,
    };
    const product = await prisma.product.upsert({
      where: { legacyId },
      create: { legacyId, slug, ...data },
      update: data,
    });

    const catIds = [...new Set(splitUrls(p.category_ids).map((path) => catByPath.get(path)).filter((x): x is number => !!x))];
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    if (catIds.length) await prisma.productCategory.createMany({ data: catIds.map((categoryId) => ({ productId: product.id, categoryId })) });

    if (flags.includes("Possible duplicate (same name)")) {
      const key = slugify(name).replace(/-/g, "");
      dupGroups.set(key, [...(dupGroups.get(key) ?? []), product.id]);
    }
  }
  console.log(`products: ${products.length}, flagged for review: ${flagged}`);

  await importImages();

  // ---- redirects for the demo product ----
  const demo = products.find((p) => (issues.get(Number(p.product_id)) ?? []).includes("Demo/test product"));
  if (demo) {
    const from = `product/${demo.product_id}`;
    await prisma.redirect.upsert({ where: { from }, create: { from, to: "/" }, update: { to: "/" } });
  }

  // Featured: a starter set of in-stock products with images, so the home page isn't empty.
  const featuredCount = await prisma.product.count({ where: { featured: true } });
  if (featuredCount === 0) {
    const picks = await prisma.product.findMany({
      where: { status: "active", stockStatus: "in_stock", images: { some: {} } },
      orderBy: { stockQty: "desc" },
      take: 12,
      select: { id: true },
    });
    await prisma.product.updateMany({ where: { id: { in: picks.map((p) => p.id) } }, data: { featured: true } });
  }
  console.log(`possible duplicate groups: ${dupGroups.size} (kept active, flagged for review in the admin)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
