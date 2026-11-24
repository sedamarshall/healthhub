"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchProductsForPicker, type PickedProduct } from "../actions-search";
import { ISearch } from "./icons";

/**
 * "Search Product" box from the reference Create Flash Sale page: type to find products, click to add,
 * remove with ×. Submits the chosen SKUs in one hidden field.
 */
export function ProductPicker({ name, initial = [] }: { name: string; initial?: PickedProduct[] }) {
  const [picked, setPicked] = useState<PickedProduct[]>(initial);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(() => start(async () => setResults(await searchProductsForPicker(term))), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const add = (p: PickedProduct) => {
    setPicked((list) => (list.some((x) => x.sku === p.sku) ? list : [...list, p]));
    setQ("");
    setOpen(false);
  };

  return (
    <div>
      <input type="hidden" name={name} value={picked.map((p) => p.sku).join(",")} />
      <div className="relative w-full" ref={box}>
        <ISearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#637381]" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="Search Product"
          aria-label="Search product to add"
          className="block h-12 w-full rounded-full border border-[rgba(145,158,171,0.2)] bg-transparent pl-10 pr-4 text-sm text-[#212529] focus:border-[#a10fe4] focus:outline-none"
        />
        {open && q.trim().length >= 2 && (
          <ul className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)]">
            {pending && !results.length && <li className="px-3 py-3 text-sm text-[#919eab]">Searching…</li>}
            {!pending && !results.length && <li className="px-3 py-3 text-sm text-[#919eab]">No products found.</li>}
            {results.map((p) => {
              const already = picked.some((x) => x.sku === p.sku);
              return (
                <li key={p.sku}>
                  <button type="button" disabled={already} onClick={() => add(p)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f9fafb] disabled:opacity-50">
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#f4f6f8]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image && <img src={p.image} alt="" className="h-full w-full object-contain mix-blend-multiply" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[#212529]">{p.name}</span>
                      <span className="text-xs text-[#919eab]">{p.sku} · KES {p.price.toLocaleString("en-KE")}</span>
                    </span>
                    <span className="text-xs font-bold text-[#a10fe4]">{already ? "Added" : "Add"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {picked.length > 0 && (
        <ul className="mt-4 divide-y divide-[rgba(145,158,171,0.2)] rounded-2xl border border-[rgba(145,158,171,0.2)]">
          {picked.map((p) => (
            <li key={p.sku} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f4f6f8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image && <img src={p.image} alt="" className="h-full w-full object-contain mix-blend-multiply" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[#212529]">{p.name}</span>
                <span className="text-xs text-[#919eab]">{p.sku}</span>
              </span>
              <span className="whitespace-nowrap text-[#212529]">KES {p.price.toLocaleString("en-KE")}</span>
              <button type="button" onClick={() => setPicked((l) => l.filter((x) => x.sku !== p.sku))} aria-label={`Remove ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#637381] hover:bg-[#f4f6f8] hover:text-[#cb0233]">×</button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-[#919eab]">{picked.length} product{picked.length === 1 ? "" : "s"} in this sale. Each one&apos;s price drops by the discount during the sale window and goes back to normal when it ends.</p>
    </div>
  );
}
