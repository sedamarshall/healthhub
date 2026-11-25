"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import type { SearchCard } from "@/app/api/search/route";
import { CloseIcon, SearchIcon } from "./Icons";

type Start = { popularSearches: string[]; categories: { name: string; slug: string; image: string | null; count: number }[]; products: SearchCard[] };
type Results = { total: number; items: SearchCard[] };

const RECENT_KEY = "hh_recent_searches";
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}
function saveRecent(term: string) {
  const t = term.trim();
  if (t.length < 2) return;
  try {
    const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

// Voice search (Chrome, Edge, Safari): typed loosely because the Web Speech API isn't in TypeScript's DOM types.
type Recognition = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const speechCtor = () => (typeof window === "undefined" ? null : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | null);

/**
 * Search window (opens from the header search box): popular & recent searches and popular products before
 * typing, then live results in a grid with one-tap add to cart. Full screen on phones.
 */
export function SearchOverlay({ open, initial = "", onClose }: { open: boolean; initial?: string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [start, setStart] = useState<Start | null>(null);
  const [res, setRes] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const term = q.trim();

  // Open: focus, lock page scroll, load the "before typing" content once.
  useEffect(() => {
    if (!open) return;
    setQ((v) => v || initial);
    setRecent(readRecent());
    const t = setTimeout(() => input.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!start) fetch("/api/search").then((r) => r.json()).then(setStart).catch(() => {});
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open, initial, start]);

  // Live results while typing (debounced; stale requests cancelled).
  useEffect(() => {
    setActive(-1);
    if (term.length < 2) { setRes(null); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        setRes(await r.json());
      } catch {}
      setLoading(false);
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [term]);

  const goSearch = useCallback((t: string) => {
    if (!t.trim()) return;
    saveRecent(t);
    onClose();
    router.push(`/search?q=${encodeURIComponent(t.trim())}`);
  }, [onClose, router]);

  const openProduct = (p: SearchCard) => { saveRecent(term || p.name); onClose(); router.push(`/p/${p.slug}`); };

  const onKey = (e: React.KeyboardEvent) => {
    const n = res?.items.length ?? 0;
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown" && n) { e.preventDefault(); setActive((a) => Math.min(n - 1, a + 1)); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && res?.items[active]) openProduct(res.items[active]); else goSearch(q); }
  };
  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const listen = () => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-KE";
    r.interimResults = false;
    r.onresult = (e) => setQ(e.results[0]?.[0]?.transcript ?? "");
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  };

  if (!open || typeof document === "undefined") return null;
  const chip = "rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-brand-600 hover:text-brand-600";

  // Rendered into <body> (portal): inside the header it would be trapped under the phone's bottom bar.
  return createPortal(
    <div className="fixed inset-0 z-[95] flex justify-center bg-black/45 backdrop-blur-[2px] sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search products" className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100vh-48px)] sm:max-w-[900px] sm:rounded-3xl">
        {/* Header + search field */}
        <div className="border-b border-line px-4 pb-4 pt-3 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="truncate text-[15px] font-semibold text-ink">{term.length >= 2 ? <>Search results for &ldquo;{term}&rdquo;</> : "Search products"}</p>
            <button type="button" onClick={onClose} aria-label="Close search" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-well"><CloseIcon /></button>
          </div>
          <form role="search" onSubmit={(e) => { e.preventDefault(); goSearch(q); }} className="flex h-12 items-center gap-2 rounded-full border-2 border-brand-600 bg-white pl-1.5 pr-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><SearchIcon className="h-[18px] w-[18px]" /></span>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Search for medicines, brands and more…"
              aria-label="Search products"
              aria-controls="search-results"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
            />
            {q && <button type="button" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear search" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-well hover:text-ink"><CloseIcon className="h-4 w-4" /></button>}
            {speechCtor() && (
              <button type="button" onClick={listen} aria-label={listening ? "Listening…" : "Search by voice"} className={`flex h-8 w-8 items-center justify-center rounded-full ${listening ? "animate-pulse bg-sale text-white" : "bg-[rgba(255,72,66,0.1)] text-sale hover:bg-[rgba(255,72,66,0.18)]"}`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </button>
            )}
          </form>
        </div>

        <div ref={list} id="search-results" className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Recent + popular searches */}
          {recent.length > 0 && term.length < 2 && (
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted">Recent searches</h3>
                <button type="button" onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch {} setRecent([]); }} className="text-xs font-semibold text-brand-600 hover:underline">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">{recent.map((r) => <button key={r} type="button" onClick={() => setQ(r)} className={chip}>↺ {r}</button>)}</div>
            </section>
          )}
          {/* On phones, once results show, the chips step aside to leave room for products. */}
          <section className={`mb-5 ${term.length >= 2 ? "hidden sm:block" : ""}`}>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8M15 7h6v6" /></svg>
              Popular searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {(start?.popularSearches ?? []).map((s) => <button key={s} type="button" onClick={() => setQ(s)} className={chip}>{s}</button>)}
            </div>
          </section>

          {term.length < 2 ? (
            <>
              {!!start?.categories.length && (
                <section className="mb-5">
                  <h3 className="mb-2 text-sm font-semibold text-muted">Popular categories</h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                    {start.categories.map((c) => (
                      <Link key={c.slug} href={`/c/${c.slug}`} onClick={onClose} className="group rounded-2xl border border-line p-2 text-center transition hover:border-brand-600">
                        <span className="relative mx-auto block aspect-square w-full overflow-hidden rounded-xl bg-[#f4f3f5]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-contain p-2 mix-blend-multiply transition group-hover:scale-105" />}
                        </span>
                        <span className="mt-1.5 block truncate text-xs font-semibold text-ink group-hover:text-brand-600">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {!!start?.products.length && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted">Popular products</h3>
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">{start.products.map((p) => <ResultCard key={p.id} p={p} onOpen={() => openProduct(p)} onClose={onClose} />)}</div>
                </section>
              )}
              {!start && <SkeletonGrid />}
            </>
          ) : (
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-muted">Search results</h3>
                {res && <span className="text-sm text-muted" aria-live="polite">{res.total.toLocaleString()} product{res.total === 1 ? "" : "s"} found</span>}
              </div>
              {loading && !res ? (
                <SkeletonGrid />
              ) : res && res.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                  <p className="font-semibold text-ink">No products match &ldquo;{term}&rdquo;</p>
                  <p className="mt-1 text-sm text-muted">Check the spelling, try a brand or the active ingredient, or ask our pharmacist.</p>
                  <Link href="/contact" onClick={onClose} className="mt-4 inline-flex h-10 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Ask a pharmacist</Link>
                </div>
              ) : (
                <div className={`grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
                  {res?.items.map((p, i) => <ResultCard key={p.id} p={p} index={i} active={i === active} onOpen={() => openProduct(p)} onClose={onClose} />)}
                </div>
              )}
            </section>
          )}
        </div>

        {res && res.total > 0 && term.length >= 2 && (
          <div className="border-t border-line px-4 py-3 sm:px-6">
            <button type="button" onClick={() => goSearch(q)} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-[15px] font-semibold text-white hover:bg-brand-700">
              View all {res.total.toLocaleString()} result{res.total === 1 ? "" : "s"}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[84px] animate-pulse rounded-2xl bg-well" />)}
    </div>
  );
}

/** Compact result: photo, name, category, price, and a round add-to-cart (or "View alternatives" when out of stock). */
function ResultCard({ p, index, active, onOpen, onClose }: { p: SearchCard; index?: number; active?: boolean; onOpen: () => void; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");
  const off = p.was ? Math.round(((p.was - p.price) / p.was) * 100) : 0;

  const add = async () => {
    setState("adding");
    const r = await addToCart(p.id, 1).catch(() => ({ ok: false }));
    setState(r.ok ? "added" : "error");
    if (r.ok) router.refresh(); // header cart count
    setTimeout(() => setState("idle"), 1800);
  };

  return (
    <div data-i={index} className={`flex items-center gap-3 rounded-2xl border bg-white p-2.5 transition-colors ${active ? "border-brand-600 bg-brand-50" : "border-line hover:border-brand-600"}`}>
      <button type="button" onClick={onOpen} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f4f3f5]" aria-label={`Open ${p.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image && <img src={p.image} alt="" loading="lazy" className={`h-full w-full object-contain p-1 mix-blend-multiply ${p.available ? "" : "opacity-50 grayscale"}`} />}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink sm:text-sm" title={p.name}>{p.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {p.rx && <span className="rounded bg-[rgba(255,171,0,0.16)] px-1 font-bold text-[#b76e00]">Rx</span>}
          <span className="truncate">{p.category ?? ""}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <span className={`font-bold ${p.was ? "text-brand-600" : "text-ink"}`}>{kes(p.price)}</span>
          {p.was && <span className="text-xs text-faint line-through">{kes(p.was)}</span>}
          {off > 0 && <span className="rounded bg-[rgba(255,72,66,0.1)] px-1 text-[11px] font-bold text-sale">-{off}%</span>}
        </span>
        {!p.available && <span className="mt-0.5 block text-xs font-semibold text-sale">Out of stock</span>}
      </button>
      {p.available ? (
        <button
          type="button"
          onClick={add}
          disabled={state === "adding"}
          aria-label={state === "added" ? `${p.name} added to cart` : `Add ${p.name} to cart`}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition ${state === "added" ? "bg-[#1cbba3]" : state === "error" ? "bg-sale" : "bg-brand-600 hover:bg-brand-700"} disabled:opacity-70`}
        >
          {state === "added" ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          ) : state === "adding" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></svg>
          )}
        </button>
      ) : (
        <Link href={p.categorySlug ? `/c/${p.categorySlug}` : `/search?q=${encodeURIComponent(p.name.split(" ")[0])}`} onClick={onClose} className="shrink-0 whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand-600 hover:text-brand-600">
          View alternatives
        </Link>
      )}
    </div>
  );
}
