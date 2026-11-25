"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "./AddToCart";
import { WishlistButton } from "./Wishlist";
import { CloseIcon } from "./Icons";

type QV = {
  id: number; slug: string; name: string; brand: string | null; sku: string; price: number; was: number | null; saleEndsAt: string | null;
  images: string[]; categories: { name: string; slug: string }[]; tags: { name: string; slug: string }[]; summary: string;
  ratingAvg: number; ratingCount: number; available: boolean; stockStatus: string; stockQty: number | null; max: number; rx: boolean;
};

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const cache = new Map<string, Promise<QV>>();
/** Fetch once per product (hovering the button warms it up so the window opens instantly). */
const load = (slug: string) => {
  if (!cache.has(slug)) cache.set(slug, fetch(`/api/products/${encodeURIComponent(slug)}/quick-view`).then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); }).catch((e) => { cache.delete(slug); throw e; }));
  return cache.get(slug)!;
};

/** The eye button on product cards: opens the Quick View window instead of leaving the page. */
export function QuickViewButton({ slug, name, className = "", children }: { slug: string; name: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href={`/p/${slug}`}
        onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); setOpen(true); }}
        onMouseEnter={() => load(slug).catch(() => {})}
        onFocus={() => load(slug).catch(() => {})}
        aria-label={`Quick view: ${name}`}
        title="Quick view"
        aria-haspopup="dialog"
        className={className}
      >
        {children}
      </a>
      {open && <QuickViewModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [p, setP] = useState<QV | null>(null);
  const [failed, setFailed] = useState(false);
  const [img, setImg] = useState(0);
  const [copied, setCopied] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { load(slug).then(setP).catch(() => setFailed(true)); }, [slug]);

  const step = useCallback((d: number) => setImg((i) => (p && p.images.length > 1 ? (i + d + p.images.length) % p.images.length : 0)), [p]);

  // Esc closes, ←/→ change photo; lock the page behind; put focus inside, give it back on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT") return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; before?.focus?.(); };
  }, [onClose, step]);

  const url = typeof window !== "undefined" && p ? `${window.location.origin}/p/${p.slug}` : "";
  const off = p?.was ? Math.round(((p.was - p.price) / p.was) * 100) : 0;
  const stock = !p ? null
    : !p.available ? { text: "Out of stock", cls: "bg-[rgba(255,72,66,0.1)] text-sale" }
    : p.stockStatus === "special_order" ? { text: "Ships in 2–3 days", cls: "bg-[rgba(255,171,0,0.14)] text-[#b76e00]" }
    : p.stockQty !== null && p.stockQty <= 5 ? { text: `Only ${p.stockQty} left`, cls: "bg-[rgba(255,171,0,0.14)] text-[#b76e00]" }
    : { text: "In stock", cls: "bg-accent-soft text-[#0d7a6a]" };

  return createPortal(
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={p ? `Quick view: ${p.name}` : "Quick view"} className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[calc(100vh-48px)] sm:max-w-[1040px] sm:rounded-3xl">
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close quick view" className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md ring-1 ring-line transition hover:rotate-90 hover:bg-ink hover:text-white">
          <CloseIcon />
        </button>

        {failed ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-ink">This product couldn&apos;t be loaded.</p>
            <Link href={`/p/${slug}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white">Open product page</Link>
          </div>
        ) : !p ? (
          <Skeleton />
        ) : (
          <div className="grid overflow-y-auto md:grid-cols-[1fr_1.05fr]">
            {/* Gallery */}
            <div className="p-4 sm:p-6 md:sticky md:top-0 md:self-start">
              <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#f4f3f5] md:aspect-square">
                {p.images.length ? (
                  <Image key={p.images[img]} src={p.images[img]} alt={p.name} fill sizes="(max-width: 768px) 92vw, 480px" className="animate-[qvFade_0.25s_ease-out] object-contain p-6 mix-blend-multiply" priority />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-faint">No photo yet</span>
                )}
                <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                  {off > 0 && <span className="rounded-full bg-sale px-2.5 py-1 text-xs font-bold text-white">-{off}%</span>}
                  {p.rx && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-sm">Rx · Prescription</span>}
                </div>
                {p.images.length > 1 && (
                  <>
                    <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100">‹</button>
                    <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100">›</button>
                  </>
                )}
              </div>
              {p.images.length > 1 && (
                <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
                  {p.images.map((src, i) => (
                    <button key={src} type="button" onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`} aria-current={i === img} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f4f3f5] ring-2 transition ${i === img ? "ring-brand-600" : "ring-transparent hover:ring-line"}`}>
                      <Image src={src} alt="" fill sizes="64px" className="object-contain p-1.5 mix-blend-multiply" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col px-4 pb-6 sm:px-6 md:py-8 md:pl-2 md:pr-8">
              {p.categories[0] && (
                <Link href={`/c/${p.categories[0].slug}`} onClick={onClose} className="mb-2 self-start text-xs font-bold uppercase tracking-wide text-[#1890ff] hover:underline">{p.categories[0].name}</Link>
              )}
              <h2 className="pr-10 font-heading text-2xl font-bold leading-tight text-ink sm:text-[28px]">{p.name}</h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="flex items-center gap-0.5" aria-label={p.ratingCount ? `Rated ${p.ratingAvg.toFixed(1)} out of 5` : "No reviews yet"}>
                  {[1, 2, 3, 4, 5].map((i) => <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i <= Math.round(p.ratingAvg) ? "fill-[#ffab00]" : "fill-line"}`} aria-hidden="true"><path d="m12 2.8 2.8 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.1 20.1l1.5-6.4-4.9-4.3 6.5-.6z" /></svg>)}
                </span>
                <Link href={`/p/${p.slug}#reviews`} onClick={onClose} className="text-muted hover:text-brand-600">{p.ratingCount ? `${p.ratingCount} review${p.ratingCount === 1 ? "" : "s"}` : "Be the first to review"}</Link>
                {stock && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stock.cls}`}>{stock.text}</span>}
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`font-heading text-[28px] font-bold ${p.was ? "text-sale" : "text-ink"}`}>{kes(p.price)}</span>
                {p.was && <span className="text-lg text-faint line-through">{kes(p.was)}</span>}
                {p.was && <span className="rounded-full bg-[rgba(255,72,66,0.1)] px-2 py-0.5 text-xs font-bold text-sale">You save {kes(p.was - p.price)}</span>}
              </div>
              {p.saleEndsAt && <p className="mt-1 text-xs text-muted">Offer ends {new Date(p.saleEndsAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>}

              {p.summary && (
                <p className="mt-4 text-[15px] leading-relaxed text-muted">
                  {p.summary}{" "}
                  <Link href={`/p/${p.slug}`} onClick={onClose} className="font-semibold text-brand-600 hover:underline">Read more</Link>
                </p>
              )}

              {p.rx && (
                <p className="mt-4 rounded-2xl bg-[rgba(255,171,0,0.1)] p-3 text-sm text-[#7a4f01]">
                  <b>Prescription medicine.</b> Upload a valid prescription at checkout; our pharmacist checks it before you pay.
                </p>
              )}

              {/* On phones the buy row stays pinned to the bottom of the sheet while you scroll the details. */}
              <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-start gap-3 border-t border-line bg-white px-4 py-3 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)] sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:p-0 md:shadow-none">
                <AddToCartButton productId={p.id} disabled={!p.available} buyNow max={Math.max(1, p.max)} className="min-w-0 flex-1" />
                <WishlistButton item={{ id: p.id, slug: p.slug, name: p.name, price: kes(p.price), image: p.images[0] }} className="!h-12 !w-12 shrink-0 !border-line" />
              </div>

              {!p.available && p.categories[0] && (
                <Link href={`/c/${p.categories[0].slug}`} onClick={onClose} className="mt-3 flex h-11 items-center justify-center rounded-full border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                  See similar products in {p.categories[0].name}
                </Link>
              )}

              <Link href={`/p/${p.slug}`} onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-600 hover:underline">
                View full details
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>

              <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">SKU</dt><dd className="text-ink">{p.sku}</dd></div>
                {p.brand && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Brand</dt><dd><Link href={`/search?q=${encodeURIComponent(p.brand)}`} onClick={onClose} className="text-ink hover:text-brand-600">{p.brand}</Link></dd></div>}
                {p.categories.length > 0 && (
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Categories</dt><dd className="text-ink">{p.categories.map((c, i) => <span key={c.slug}>{i > 0 && ", "}<Link href={`/c/${c.slug}`} onClick={onClose} className="hover:text-brand-600">{c.name}</Link></span>)}</dd></div>
                )}
                {p.tags.length > 0 && (
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Tags</dt><dd className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Link key={t.slug} href={`/search?q=${encodeURIComponent(t.name)}`} onClick={onClose} className="rounded-full bg-well px-2.5 py-0.5 text-xs text-ink hover:text-brand-600">{t.name}</Link>)}</dd></div>
                )}
              </dl>

              <div className="mt-5 flex items-center gap-2">
                <span className="mr-1 text-sm text-muted">Share</span>
                {[
                  { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${p.name} ${url}`)}`, d: "M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12Z M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2Z" },
                  { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, d: "M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2l.5-3H14V8.5c0-.3.2-.5.5-.5Z" },
                  { label: "X", href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.name)}`, d: "M5 5l14 14M19 5 5 19" },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${s.label}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition hover:border-brand-600 hover:text-brand-600">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.d} /></svg>
                  </a>
                ))}
                <button
                  type="button"
                  onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} }}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-ink transition hover:border-brand-600 hover:text-brand-600"
                >
                  {copied ? "Link copied ✓" : "Copy link"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6 p-6 md:grid-cols-2" aria-busy="true" aria-label="Loading">
      <div className="aspect-square animate-pulse rounded-2xl bg-well" />
      <div className="space-y-4 pt-2">
        <div className="h-3 w-24 animate-pulse rounded bg-well" />
        <div className="h-8 w-4/5 animate-pulse rounded bg-well" />
        <div className="h-4 w-40 animate-pulse rounded bg-well" />
        <div className="h-9 w-36 animate-pulse rounded bg-well" />
        <div className="space-y-2"><div className="h-3 animate-pulse rounded bg-well" /><div className="h-3 animate-pulse rounded bg-well" /><div className="h-3 w-2/3 animate-pulse rounded bg-well" /></div>
        <div className="h-12 animate-pulse rounded-full bg-well" />
      </div>
    </div>
  );
}
