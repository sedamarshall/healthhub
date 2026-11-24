"use client";

import { ChevronLeft, ChevronRight } from "./Icons";

/** Prev/next buttons that scroll a horizontal rail (by element id). */
export function RailArrows({ target, light = false }: { target: string; light?: boolean }) {
  const move = (dir: number) => {
    const el = document.getElementById(target);
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const cls = `flex h-10 w-10 items-center justify-center rounded-full ${light ? "bg-white text-ink shadow" : "border border-line bg-white text-ink hover:border-brand-600 hover:text-brand-600"}`;
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => move(-1)} className={cls} aria-label="Previous"><ChevronLeft /></button>
      <button type="button" onClick={() => move(1)} className={cls} aria-label="Next"><ChevronRight /></button>
    </div>
  );
}
