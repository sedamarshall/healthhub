"use client";

import { useState } from "react";

/**
 * "Select Tags" field (reference layout): chosen tags show as chips; type to filter the existing tags
 * or press Enter / comma to add a new one. Submits a comma-separated "tags" value.
 */
export function TagPicker({ tags, initial }: { tags: string[]; initial: string }) {
  const [chips, setChips] = useState<string[]>(() => initial.split(",").map((t) => t.trim()).filter(Boolean));
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);

  const add = (t: string) => {
    const v = t.trim().replace(/,+$/, "");
    if (v && !chips.some((c) => c.toLowerCase() === v.toLowerCase()) && chips.length < 20) setChips([...chips, v]);
    setQ("");
  };
  const needle = q.trim().toLowerCase();
  const suggestions = tags.filter((t) => !chips.includes(t) && (!needle || t.toLowerCase().includes(needle))).slice(0, 8);

  return (
    <div className="relative">
      <input type="hidden" name="tags" value={chips.join(", ")} />
      <div className={`flex min-h-14 flex-wrap items-center gap-2 rounded-[28px] border px-3.5 py-2.5 ${focus ? "border-[#a10fe4]" : "border-[rgba(145,158,171,0.2)]"}`}>
        {chips.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-[rgba(161,15,228,0.08)] py-1 pl-3 pr-1.5 text-xs font-semibold text-[#850cbd]">
            {c}
            <button type="button" onClick={() => setChips(chips.filter((x) => x !== c))} aria-label={`Remove tag ${c}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-[rgba(161,15,228,0.16)]">×</button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setQ(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(q); }
            if (e.key === "Backspace" && !q && chips.length) setChips(chips.slice(0, -1));
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder={chips.length ? "Add another tag" : "Select Tags"}
          aria-label="Add a tag"
          className="min-w-[140px] flex-1 bg-transparent text-sm text-[#212529] outline-none placeholder:text-[#919eab]"
        />
      </div>
      {focus && (suggestions.length > 0 || needle) && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-[rgba(145,158,171,0.2)] bg-white p-2 shadow-[0_12px_24px_-4px_rgba(145,158,171,0.24)]">
          {needle && !tags.some((t) => t.toLowerCase() === needle) && (
            <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(q)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#a10fe4] hover:bg-[#f9fafb]">+ Add &ldquo;{q.trim()}&rdquo;</button></li>
          )}
          {suggestions.map((t) => (
            <li key={t}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(t)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#212529] hover:bg-[#f9fafb]">{t}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
