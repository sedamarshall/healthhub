"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "./Icons";
import { SearchOverlay } from "./SearchOverlay";

const WORDS = ["Panadol", "Vitamins", "Skincare", "Baby care", "BP monitors", "Sunscreen", "First aid"];

/**
 * Header search: looks like a search field with a rotating "Search for …" hint; clicking, tapping or starting
 * to type opens the search window. Keyboard shortcut: "/" or Ctrl/⌘+K.
 */
export function SearchBox({ initial = "" }: { initial?: string; autoFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(initial);
  const [word, setWord] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initial || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, [initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!btn.current?.offsetParent) return; // the header has a desktop and a phone copy: only the visible one reacts
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen(true)}
        // Typing a letter while the trigger has focus goes straight into the search window.
        onKeyDown={(e) => { if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setSeed(e.key); setOpen(true); } }}
        aria-haspopup="dialog"
        aria-label="Search products"
        className="group relative flex h-12 w-full items-center rounded-full border border-line bg-white pl-5 pr-12 text-left text-[15px] transition-colors hover:border-brand-600 focus-visible:border-brand-600 focus-visible:outline-none"
      >
        {initial ? (
          <span className="truncate text-ink">{initial}</span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-faint">
            Search for
            <span key={word} className="animate-[searchWord_0.45s_ease-out] truncate font-medium text-muted">{WORDS[word]}</span>
            <span className="ml-0.5 tracking-widest text-faint" aria-hidden="true">…</span>
          </span>
        )}
        <span className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white transition-colors group-hover:bg-brand-700">
          <SearchIcon className="h-[18px] w-[18px]" />
        </span>
      </button>
      <SearchOverlay open={open} initial={seed || initial} onClose={() => { setOpen(false); setSeed(""); }} />
    </>
  );
}
