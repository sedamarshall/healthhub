"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { slug: string; name: string; price: string; image?: string };
const KEY = "hh_recent";

function read(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** Put on product pages: remembers this product in the viewer's browser. */
export function TrackView({ item }: { item: Item }) {
  useEffect(() => {
    try {
      const list = [item, ...read().filter((i) => i.slug !== item.slug)].slice(0, 12);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
  }, [item]);
  return null;
}

export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => setItems(read().filter((i) => i.slug !== exclude)), [exclude]);
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="mb-4 text-xl font-bold sm:text-2xl">Recently viewed</h2>
      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {items.map((i) => (
          <Link key={i.slug} href={`/p/${i.slug}`} className="card w-36 shrink-0 p-3 hover:shadow-md sm:w-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.image ? <img src={i.image} alt={i.name} loading="lazy" className="aspect-square w-full object-contain" /> : <div className="aspect-square bg-brand-50" />}
            <p className="mt-2 line-clamp-2 text-xs font-medium">{i.name}</p>
            <p className="mt-1 text-xs font-bold text-brand-700">{i.price}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
