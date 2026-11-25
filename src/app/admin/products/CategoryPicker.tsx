"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Cat = { id: number; name: string; depth: number };

/**
 * "Category" field in Basic Information (reference layout): looks like the other pill fields and opens a
 * searchable, indented checklist. Ticking a sub-category also ticks its parents, so the product shows
 * on both the sub-category and the main category pages.
 */
export function CategoryPicker({ categories, selected }: { categories: Cat[]; selected: number[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<number>>(() => new Set(selected));
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  // Parent chain of each category, worked out from the tree order + depth.
  const parents = useMemo(() => {
    const map = new Map<number, number[]>();
    const stack: Cat[] = [];
    for (const c of categories) {
      while (stack.length && stack[stack.length - 1].depth >= c.depth) stack.pop();
      map.set(c.id, stack.map((s) => s.id));
      stack.push(c);
    }
    return map;
  }, [categories]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus(); // type straight away to find a category
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = (id: number, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) [id, ...(parents.get(id) ?? [])].forEach((x) => next.add(x));
      else next.delete(id);
      return next;
    });

  const names = categories.filter((c) => picked.has(c.id));
  // Show the most specific picks first in the summary (a sub-category says more than its parent).
  const summary = [...names].sort((a, b) => b.depth - a.depth).map((c) => c.name);
  const needle = q.trim().toLowerCase();

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={summary.length ? `Category: ${summary.join(", ")}` : "Category"}
        className={`flex h-14 w-full items-center gap-2 rounded-full border bg-transparent px-3.5 text-left text-sm ${open ? "border-[#a10fe4]" : "border-[rgba(145,158,171,0.2)]"}`}
      >
        <span className={`min-w-0 flex-1 truncate ${summary.length ? "text-[#212529]" : "text-[#919eab]"}`}>
          {summary.length ? `${summary.slice(0, 2).join(", ")}${summary.length > 2 ? ` +${summary.length - 2}` : ""}` : "Category"}
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-[#212529] transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {summary.length > 0 && <span className="pointer-events-none absolute left-3.5 top-0 z-10 -translate-y-1/2 bg-white px-1 text-xs text-[#a10fe4]">Category</span>}

      {/* Always rendered (just hidden) so the ticked boxes are submitted with the form. */}
      <div className={`absolute left-0 right-0 top-full z-30 mt-1 rounded-2xl border border-[rgba(145,158,171,0.2)] bg-white p-3 shadow-[0_12px_24px_-4px_rgba(145,158,171,0.24)] ${open ? "" : "hidden"}`}>
        <input
          ref={search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
          className="mb-2 h-10 w-full rounded-full border border-[rgba(145,158,171,0.2)] bg-transparent px-4 text-sm outline-none focus:border-[#a10fe4]"
        />
        <div className="max-h-72 overflow-y-auto" role="listbox" aria-multiselectable="true">
          {categories.map((c) => {
            const on = picked.has(c.id);
            const hidden = needle && !c.name.toLowerCase().includes(needle);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#212529] hover:bg-[#f9fafb] ${on ? "bg-[rgba(161,15,228,0.06)]" : ""} ${hidden ? "hidden" : ""}`}
                style={{ paddingLeft: needle ? 8 : 8 + c.depth * 18 }}
              >
                <input type="checkbox" name="categoryIds" value={c.id} checked={on} onChange={(e) => toggle(c.id, e.target.checked)} className="h-4 w-4 accent-[#a10fe4]" />
                <span className={c.depth === 0 ? "font-semibold" : ""}>{c.name}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-[rgba(145,158,171,0.2)] pt-2 text-xs text-[#919eab]">
          <span>{picked.size} selected · parents are ticked for you</span>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-[#a10fe4] px-3 py-1 font-semibold text-white">Done</button>
        </div>
      </div>
    </div>
  );
}
