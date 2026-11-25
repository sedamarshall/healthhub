import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";

/**
 * The visitor's real IP.
 * Live site: Cloudflare puts the visitor's address in CF-Connecting-IP and overwrites anything the visitor
 * sends, so it can't be faked as long as the server only accepts traffic from Cloudflare (see DEPLOY.md).
 * Without Cloudflare, Nginx's X-Real-IP ($remote_addr) is used. X-Forwarded-For is only a last resort and
 * we take the entry added by our own proxy (the last one), never the first, which the visitor controls.
 */
export async function clientIp() {
  const h = await headers();
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.length ? xff[xff.length - 1] : "local";
}

let lastSweep = 0;

/**
 * Returns true when the action is allowed (at most `limit` times per `windowMs` for this key).
 * Hits are stored in the database, so a restart or deploy doesn't reset the limits.
 */
export async function allow(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const since = new Date(now - windowMs);
  try {
    const count = await prisma.rateHit.count({ where: { key, at: { gte: since } } });
    if (count >= limit) return false;
    await prisma.rateHit.create({ data: { key } });
    // Housekeeping: drop hits older than a day, at most once an hour.
    if (now - lastSweep > 3_600_000) {
      lastSweep = now;
      await prisma.rateHit.deleteMany({ where: { at: { lt: new Date(now - 86_400_000) } } });
    }
    return true;
  } catch {
    return true; // never lock everyone out because of a database hiccup
  }
}

/** How many times this key was hit in the window (without recording a new hit). */
export async function hitsFor(key: string, windowMs: number): Promise<number> {
  return prisma.rateHit.count({ where: { key, at: { gte: new Date(Date.now() - windowMs) } } }).catch(() => 0);
}

/** Forget the hits for a key (e.g. after a successful login). */
export async function resetHits(key: string) {
  await prisma.rateHit.deleteMany({ where: { key } }).catch(() => {});
}
