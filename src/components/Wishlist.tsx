"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartIcon } from "./Icons";
import { HeartHi } from "./Hi";

/** Wishlist kept in the shopper's browser (no account needed). */
export type WishItem = { id: number; slug: string; name: string; price: string; image?: string };
const KEY = "hh_wishlist";
const EVT = "hh-wishlist";

export function readWishlist(): WishItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(list: WishItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVT));
  } catch {}
}
function useWishlist() {
  const [list, setList] = useState<WishItem[]>([]);
  useEffect(() => {
    const sync = () => setList(readWishlist());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

export function WishlistButton({ item, className = "", iconSize = 20 }: { item: WishItem; className?: string; iconSize?: number }) {
  const list = useWishlist();
  const saved = list.some((i) => i.id === item.id);
  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      aria-pressed={saved}
      onClick={() => write(saved ? list.filter((i) => i.id !== item.id) : [item, ...list].slice(0, 100))}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white transition-colors duration-300 ${saved ? "!text-sale" : ""} ${className}`}
    >
      {saved ? <HeartIcon filled className="h-5 w-5 shrink-0" /> : <HeartHi size={iconSize} />}
    </button>
  );
}

export function WishlistCount() {
  const n = useWishlist().length;
  return <>{n}</>;
}

export function WishlistPage() {
  const list = useWishlist();
  if (!list.length) {
    return (
      <div className="py-16 text-center">
        <HeartIcon className="mx-auto h-12 w-12 text-faint" />
        <p className="mt-4 font-heading text-xl font-bold">Your wishlist is empty</p>
        <p className="mt-1 text-muted">Tap the heart on any product to save it for later.</p>
        <Link href="/search" className="btn-primary mt-6">Browse products</Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {list.map((i) => (
        <div key={i.id} className="card flex flex-col p-4">
          <Link href={`/p/${i.slug}`} className="block aspect-square overflow-hidden rounded-lg bg-well">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-contain p-4 mix-blend-multiply" loading="lazy" />}
          </Link>
          <Link href={`/p/${i.slug}`} className="mt-3 line-clamp-2 font-heading text-sm font-semibold hover:text-brand-600">{i.name}</Link>
          <p className="mt-1 font-semibold">{i.price}</p>
          <div className="mt-auto flex gap-2 pt-3">
            <Link href={`/p/${i.slug}`} className="btn-primary h-11 flex-1">View product</Link>
            <WishlistButton item={i} />
          </div>
        </div>
      ))}
    </div>
  );
}
