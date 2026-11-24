import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * 301 redirects for old OpenCart URLs. next.config.ts rewrites /index.php here, so
 *   /index.php?route=product/product&product_id=123  → /p/<slug>
 *   /index.php?route=product/category&path=1_3       → /c/<slug>
 *   /index.php?route=product/search&search=panadol   → /search?q=panadol
 *   anything else                                    → /
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const route = sp.get("route") ?? "";
  const go = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin), 301);

  if (route === "product/product") {
    const id = Number(sp.get("product_id"));
    if (id) {
      const manual = await prisma.redirect.findUnique({ where: { from: `product/${id}` } });
      if (manual) {
        await prisma.redirect.update({ where: { from: manual.from }, data: { hits: { increment: 1 } } });
        return go(manual.to);
      }
      const p = await prisma.product.findUnique({
        where: { legacyId: id },
        select: { slug: true, status: true, categories: { select: { category: { select: { slug: true, isActive: true } } }, take: 1 } },
      });
      if (p?.status === "active") return go(`/p/${p.slug}`);
      const cat = p?.categories[0]?.category;
      if (cat?.isActive) return go(`/c/${cat.slug}`);
    }
    return go("/search");
  }

  if (route === "product/category") {
    const path = sp.get("path") ?? "";
    const c = await prisma.category.findUnique({ where: { legacyPath: path }, select: { slug: true, isActive: true } });
    if (c?.isActive) return go(`/c/${c.slug}`);
    // fall back to the deepest known part of the path
    const last = path.split("_").pop();
    const byId = last ? await prisma.category.findUnique({ where: { legacyId: Number(last) }, select: { slug: true, isActive: true } }) : null;
    return go(byId?.isActive ? `/c/${byId.slug}` : "/");
  }

  if (route === "product/search") {
    const q = sp.get("search") ?? sp.get("tag") ?? "";
    return go(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  if (route.startsWith("account/")) return go("/account");
  if (route === "checkout/cart") return go("/cart");
  return go("/");
}
