"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CardProduct } from "@/lib/catalog";
import { loadTabProducts } from "@/app/actions/catalog";
import { ProductGrid } from "./ProductCard";

/**
 * "Our Products" tabs. The first tab is rendered on the server; the others load when clicked,
 * which keeps the home page small and fast on phones.
 */
export function ProductTabs({ tabs, first }: { tabs: { label: string; slug: string | null }[]; first: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, CardProduct[]>>({});
  const [pending, start] = useTransition();

  const open = (i: number) => {
    setActive(i);
    const slug = tabs[i].slug;
    if (i > 0 && slug && !loaded[i]) start(async () => {
      const list = await loadTabProducts(slug);
      setLoaded((l) => ({ ...l, [i]: list }));
    });
  };
  const slug = tabs[active].slug;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <h2 className="section-title">Our Products</h2>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={active === i}
              onClick={() => open(i)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${active === i ? "bg-brand-600 text-white" : "border border-line bg-white text-ink hover:border-brand-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel">
        {active === 0 ? first : loaded[active] ? <ProductGrid products={loaded[active]} /> : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 2xl:grid-cols-6" aria-busy={pending}>
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[300px] sm:h-[446px] animate-pulse rounded-2xl border border-line bg-well/60" />)}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href={slug ? `/c/${slug}` : "/search"} className="inline-flex h-12 items-center rounded-full bg-brand-600 px-8 font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700">View all</Link>
        </div>
      </div>
    </div>
  );
}
