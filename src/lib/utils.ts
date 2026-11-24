export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function kes(amount: number): string {
  return "KES " + amount.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

export function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

type Priced = { price: number; salePrice: number | null; saleStartsAt?: Date | null; saleEndsAt?: Date | null };

/** True when the sale price applies right now (respects flash-sale start/end times). */
export function saleActive(p: Priced, now = new Date()): boolean {
  if (!p.salePrice || p.salePrice <= 0 || p.salePrice >= p.price) return false;
  if (p.saleStartsAt && now < p.saleStartsAt) return false;
  if (p.saleEndsAt && now > p.saleEndsAt) return false;
  return true;
}

export function effectivePrice(p: Priced): number {
  return saleActive(p) ? p.salePrice! : p.price;
}

/** Normalise a Kenyan phone number to 2547XXXXXXXX / 2541XXXXXXXX, or null if invalid. */
export function normalizeKenyanPhone(input: string): string | null {
  const d = (input || "").replace(/\D/g, "");
  let n = d;
  if (n.startsWith("0")) n = "254" + n.slice(1);
  else if (n.length === 9 && (n.startsWith("7") || n.startsWith("1"))) n = "254" + n;
  return /^254(7|1)\d{8}$/.test(n) ? n : null;
}

export function canPurchase(p: { status: string; stockStatus: string; stockQty: number; price: number }): boolean {
  if (p.status !== "active" || p.price <= 0) return false;
  if (p.stockStatus === "special_order") return true;
  return p.stockStatus === "in_stock" && p.stockQty > 0;
}

export function maxQty(p: { stockStatus: string; stockQty: number }): number {
  return p.stockStatus === "special_order" ? 20 : Math.max(0, Math.min(p.stockQty, 20));
}
