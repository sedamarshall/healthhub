"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./Icons";

type Hit = { slug: string; name: string; price: string; image?: string };

export function SearchBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setHits(await res.json());
        setOpen(true);
      } catch {}
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <form
      ref={box}
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        autoFocus={autoFocus}
        type="search"
        placeholder="Search medicines, vitamins, brands…"
        aria-label="Search products"
        className="h-12 w-full rounded-full border border-line bg-white pl-5 pr-12 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand-600"
      />
      <button type="submit" aria-label="Search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:text-brand-600">
        <SearchIcon />
      </button>
      {open && hits.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          {hits.map((h) => (
            <li key={h.slug}>
              <a href={`/p/${h.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-well">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {h.image ? <img src={h.image} alt="" className="h-10 w-10 rounded object-contain" loading="lazy" /> : <span className="h-10 w-10 rounded bg-brand-50" />}
                <span className="flex-1 text-sm">{h.name}</span>
                <span className="text-xs font-semibold text-brand-600">{h.price}</span>
              </a>
            </li>
          ))}
          <li>
            <button type="submit" className="w-full bg-well px-3 py-2 text-left text-xs font-semibold text-brand-600">See all results for “{q}”</button>
          </li>
        </ul>
      )}
    </form>
  );
}
