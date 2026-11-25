import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import { STORE } from "./config";
import { later } from "./notify";
import { sendAccountEmail } from "./mail";

/*
 * Guest orders placed with an email are only added to an account after the account holder proves they own
 * that email (by clicking a link sent to it). Otherwise anyone could register with someone else's email and
 * read their order history: name, phone, address and the medicines they bought.
 */

const key = () => new TextEncoder().encode(`${process.env.AUTH_SECRET || "dev-only-secret-change-me"}:link-orders`);

export async function linkOrdersToken(uid: number, email: string) {
  return new SignJWT({ uid, email, purpose: "link-orders" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key());
}

/** After sign-up: if guest orders exist for this email, email a confirm link (no-op otherwise). */
export function offerToLinkGuestOrders(user: { id: number; name: string; email: string }) {
  later(async () => {
    const n = await prisma.order.count({ where: { email: user.email, userId: null } });
    if (!n) return;
    const link = `${STORE.appUrl}/api/link-orders?t=${await linkOrdersToken(user.id, user.email)}`;
    await sendAccountEmail("link_orders", user.email, { name: user.name, link });
  });
}

/** Verifies the emailed link and attaches the guest orders. Returns how many were linked, or null if the link is bad. */
export async function linkGuestOrders(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== "link-orders") return null;
    const uid = Number(payload.uid);
    const email = String(payload.email);
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, isActive: true } });
    if (!user || !user.isActive || user.email !== email) return null; // email changed since: the link no longer proves anything
    const r = await prisma.order.updateMany({ where: { email, userId: null }, data: { userId: uid } });
    return r.count;
  } catch {
    return null;
  }
}
