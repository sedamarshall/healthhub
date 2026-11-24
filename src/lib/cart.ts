import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { effectivePrice } from "./utils";

export const CART_COOKIE = "hh_cart";

export async function getCartId(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value;
}

export async function getOrCreateCartId(): Promise<string> {
  const existing = await getCartId();
  if (existing && (await prisma.cart.findUnique({ where: { id: existing }, select: { id: true } }))) return existing;
  const cart = await prisma.cart.create({ data: {} });
  (await cookies()).set(CART_COOKIE, cart.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return cart.id;
}

export async function getCart() {
  const id = await getCartId();
  if (!id) return { id: null, items: [], subtotal: 0, count: 0, hasRx: false };
  const cart = await prisma.cart.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  });
  if (!cart) return { id: null, items: [], subtotal: 0, count: 0, hasRx: false };
  const items = cart.items.map((i) => ({
    id: i.id,
    qty: i.qty,
    product: i.product,
    unitPrice: effectivePrice(i.product),
    lineTotal: effectivePrice(i.product) * i.qty,
  }));
  return {
    id: cart.id,
    items,
    subtotal: items.reduce((a, i) => a + i.lineTotal, 0),
    count: items.reduce((a, i) => a + i.qty, 0),
    hasRx: items.some((i) => i.product.rxClass === "pom"),
  };
}

export async function getCartCount(): Promise<number> {
  const id = await getCartId();
  if (!id) return 0;
  const r = await prisma.cartItem.aggregate({ where: { cartId: id }, _sum: { qty: true } });
  return r._sum.qty ?? 0;
}

/** Attach the current browser cart to a signed-in user (so abandoned carts show who they belong to). */
export async function linkCartToUser(userId: number) {
  const id = await getCartId();
  if (id) await prisma.cart.updateMany({ where: { id }, data: { userId } });
}

export const COUPON_COOKIE = "hh_coupon";
export async function getCartCoupon(): Promise<string | undefined> {
  return (await cookies()).get(COUPON_COOKIE)?.value;
}
