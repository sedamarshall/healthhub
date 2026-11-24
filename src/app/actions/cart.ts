"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { COUPON_COOKIE, getCart, getCartId, getOrCreateCartId } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import { evaluateCoupon } from "@/lib/coupons";
import { canPurchase, effectivePrice, maxQty, saleActive } from "@/lib/utils";

export type CartResult = { ok: boolean; message: string };

export async function addToCart(productId: number, qty = 1): Promise<CartResult> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !canPurchase(product)) return { ok: false, message: "This product is not available right now." };
  const cartId = await getOrCreateCartId();
  const session = await getSession();
  if (session) await prisma.cart.updateMany({ where: { id: cartId, userId: null }, data: { userId: session.uid } });
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  const limit = maxQty(product);
  const next = Math.min((existing?.qty ?? 0) + Math.max(1, Math.floor(qty)), limit);
  if (existing && existing.qty >= limit) return { ok: false, message: `Only ${limit} available.` };
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, qty: next },
    update: { qty: next },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Added to cart" };
}

export async function updateCartItem(itemId: number, qty: number): Promise<CartResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Cart not found" };
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId }, include: { product: true } });
  if (!item) return { ok: false, message: "Item not found" };
  if (qty <= 0) await prisma.cartItem.delete({ where: { id: item.id } });
  else await prisma.cartItem.update({ where: { id: item.id }, data: { qty: Math.min(Math.floor(qty), maxQty(item.product) || 1) } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Cart updated" };
}

export async function removeCartItem(itemId: number): Promise<CartResult> {
  return updateCartItem(itemId, 0);
}

export async function clearCart(): Promise<CartResult> {
  const cartId = await getCartId();
  if (cartId) await prisma.cartItem.deleteMany({ where: { cartId } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Cart cleared" };
}

/** Apply (or remove, with an empty code) a coupon for this browser's cart. */
export async function applyCoupon(code: string): Promise<CartResult> {
  const jar = await cookies();
  if (!code.trim()) {
    jar.delete(COUPON_COOKIE);
    revalidatePath("/", "layout");
    return { ok: true, message: "Coupon removed" };
  }
  const cart = await getCart();
  const r = await evaluateCoupon(code, cart.subtotal);
  if (!r.ok) return { ok: false, message: r.message };
  jar.set(COUPON_COOKIE, r.code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  revalidatePath("/", "layout");
  return { ok: true, message: `Coupon applied: ${r.title}` };
}

export type DrawerItem = { id: number; productId: number; qty: number; max: number; name: string; slug: string; image: string | null; price: number; oldPrice: number | null; rx: boolean };
export type DrawerProduct = { id: number; name: string; slug: string; image: string | null; price: number; oldPrice: number | null; brand: string | null; onSale: boolean };

/** Everything the header cart drawer shows: the cart lines and up to 6 similar products. */
export async function loadCartDrawer(): Promise<{ items: DrawerItem[]; subtotal: number; count: number; similar: DrawerProduct[] }> {
  const cart = await getCart();
  const items: DrawerItem[] = cart.items.map((i) => ({
    id: i.id,
    productId: i.product.id,
    qty: i.qty,
    max: maxQty(i.product) || i.qty,
    name: i.product.name,
    slug: i.product.slug,
    image: i.product.images[0]?.url ?? null,
    price: i.unitPrice,
    oldPrice: i.unitPrice < i.product.price ? i.product.price : null,
    rx: i.product.rxClass === "pom",
  }));

  const inCart = items.map((i) => i.productId);
  const cats = inCart.length
    ? (await prisma.productCategory.findMany({ where: { productId: { in: inCart } }, select: { categoryId: true } })).map((c) => c.categoryId)
    : [];
  const base = { status: "active", price: { gt: 0 }, id: { notIn: inCart }, OR: [{ stockStatus: "special_order" }, { stockStatus: "in_stock", stockQty: { gt: 0 } }] };
  const pick = { include: { images: { orderBy: { position: "asc" as const }, take: 1 } }, take: 6, orderBy: [{ ratingCount: "desc" as const }, { id: "desc" as const }] };
  let found = cats.length ? await prisma.product.findMany({ where: { ...base, categories: { some: { categoryId: { in: [...new Set(cats)] } } } }, ...pick }) : [];
  if (found.length < 6) found = [...found, ...(await prisma.product.findMany({ where: { ...base, id: { notIn: [...inCart, ...found.map((f) => f.id)] } }, ...pick, take: 6 - found.length }))];

  const now = new Date();
  const similar: DrawerProduct[] = found.map((p) => {
    const price = effectivePrice(p);
    return { id: p.id, name: p.name, slug: p.slug, image: p.images[0]?.url ?? null, price, oldPrice: price < p.price ? p.price : null, brand: p.brand, onSale: saleActive(p, now) };
  });
  return { items, subtotal: cart.subtotal, count: cart.count, similar };
}
