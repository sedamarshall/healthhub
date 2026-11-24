"use client";

import { useState } from "react";
import Link from "next/link";
import { CategoryIcon } from "./CategoryIcon";
import { CloseIcon, MenuIcon, ChevronDown } from "./Icons";

type Cat = { id: number; name: string; slug: string; children: { id: number; name: string; slug: string }[] };

export function MobileMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink lg:hidden" aria-label="Open menu">
        <MenuIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Categories">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-bold">Shop by category</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1">
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {categories.map((c) =>
                c.children.length ? (
                  <details key={c.id} className="group border-b border-line">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-[15px] font-medium">
                      <CategoryIcon slug={c.slug} name={c.name} size={36} />
                      <span className="flex-1">{c.name}</span>
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </summary>
                    <div className="bg-canvas pb-2">
                      <Link href={`/c/${c.slug}`} onClick={() => setOpen(false)} className="block px-6 py-2 text-sm font-semibold text-brand-700">
                        All {c.name}
                      </Link>
                      {c.children.map((s) => (
                        <Link key={s.id} href={`/c/${s.slug}`} onClick={() => setOpen(false)} className="block px-6 py-2 text-sm text-muted">
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  </details>
                ) : (
                  <Link key={c.id} href={`/c/${c.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[15px] font-medium">
                    <CategoryIcon slug={c.slug} name={c.name} size={36} />
                    {c.name}
                  </Link>
                ),
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
