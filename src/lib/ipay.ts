import "server-only";
import { createHmac } from "node:crypto";
import { STORE } from "./config";

/**
 * iPay Africa hosted checkout (Kenya): the customer pays on iPay's page with M-Pesa, Airtel Money
 * or card, then iPay sends them back to /api/ipay/callback.
 *
 * Every iPay-specific detail lives in this file. Check it against the docs in your iPay merchant
 * account before going live. Safety: an order is only marked paid after the server re-checks the
 * transaction with iPay's IPN endpoint, never on the redirect alone, so a wrong detail here can only
 * stop payments from being confirmed, not confirm a payment that didn't happen.
 *
 * .env:
 *   IPAY_VENDOR_ID   your iPay vendor id
 *   IPAY_HASH_KEY    your iPay hash (security) key
 *   IPAY_LIVE        1 for real payments, 0 for iPay's test mode
 */
export const IPAY = {
  checkoutUrl: "https://payments.ipayafrica.com/v3/ke",
  ipnUrl: "https://www.ipayafrica.com/ipn/",
  currency: "KES",
  status: {
    success: "aei7p7yrx4ae34",
    failed: "fe2707etr5s4wq",
    pending: "bdi6p2yy76etrs",
    used: "cr5i3pgy9867e1",
    less: "dtfi4p7yty45wq",
    more: "eq3i7p5yt7645e",
  },
} as const;

export const ipayConfigured = () => !!(process.env.IPAY_VENDOR_ID && process.env.IPAY_HASH_KEY);
/** Without keys, development uses a stand-in page instead of iPay. Never in production. */
export const ipaySimulated = () => !ipayConfigured() && process.env.NODE_ENV !== "production";
export const ipayLive = () => process.env.IPAY_LIVE === "1";
export const ipayCallbackUrl = () => `${STORE.appUrl}/api/ipay/callback`;

/** Hidden form fields (in iPay's order) for the hosted checkout, signed with the hash key. */
export function checkoutFields(o: { orderNumber: string; reference: string; amount: number; phone: string; email: string }) {
  const f: [string, string][] = [
    ["live", ipayLive() ? "1" : "0"],
    ["oid", o.orderNumber],
    ["inv", o.reference],
    ["ttl", String(Math.round(o.amount))],
    ["tel", o.phone.replace(/^254/, "0")],
    ["eml", o.email],
    ["vid", process.env.IPAY_VENDOR_ID ?? ""],
    ["curr", IPAY.currency],
    ["p1", o.orderNumber],
    ["p2", ""],
    ["p3", ""],
    ["p4", ""],
    ["cbk", ipayCallbackUrl()],
    ["cst", "1"], // iPay emails the customer a receipt
    ["crl", "0"], // send the callback as a normal redirect with query parameters
  ];
  const datastring = f.map(([, v]) => v).join("");
  const hsh = createHmac("sha1", process.env.IPAY_HASH_KEY ?? "").update(datastring).digest("hex");
  return Object.fromEntries([...f, ["hsh", hsh]]) as Record<string, string>;
}

/** Ask iPay whether a callback is genuine. Returns iPay's status code (see IPAY.status). */
export async function verifyWithIpn(q: URLSearchParams): Promise<string> {
  const params = new URLSearchParams({ vendor: process.env.IPAY_VENDOR_ID ?? "" });
  for (const k of ["id", "ivm", "qwh", "afd", "poi", "uyt", "ifd"]) params.set(k, q.get(k) ?? "");
  const res = await fetch(`${IPAY.ipnUrl}?${params}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  return (await res.text()).trim();
}
