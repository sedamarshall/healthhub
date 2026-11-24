"use client";

import { useState } from "react";

/** Filterable category checklist (tree, indented by depth). */
export function CategoryPicker({ categories, selected }: { categories: { id: number; name: string; depth: number }[]; selected: number[] }) {
  const [q, setQ] = useState("");
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter categories..."
        aria-label="Filter categories"
        className="mb-3 h-10 w-full rounded-full border border-[rgba(145,158,171,0.2)] px-4 text-sm outline-none focus:border-[#a10fe4]"
      />
      <div className="max-h-72 overflow-y-auto rounded-2xl border border-[rgba(145,158,171,0.2)] p-3">
        {categories.map((c) => (
          <label
            key={c.id}
            className={`flex items-center gap-2 py-1 text-sm text-[#212529] ${q && !c.name.toLowerCase().includes(q.toLowerCase()) ? "hidden" : ""}`}
            style={{ paddingLeft: q ? 0 : c.depth * 18 }}
          >
            <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selected.includes(c.id)} className="h-4 w-4 accent-[#a10fe4]" />
            <span className={c.depth === 0 ? "font-semibold" : ""}>{c.name}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-[#919eab]">Tick the sub-category and its parent so the product shows in both.</p>
    </div>
  );
}
