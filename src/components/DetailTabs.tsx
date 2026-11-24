"use client";

import { useEffect, useState } from "react";

/** Pill tabs + bordered panel with grey title bar (reference product-details tabs). */
export function DetailTabs({ tabs, panels }: { tabs: string[]; panels: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  // Deep links like #reviews open the matching tab
  useEffect(() => {
    const sync = () => {
      const i = tabs.findIndex((t) => `#${t.toLowerCase().replace(/\s+/g, "-")}` === window.location.hash);
      if (i >= 0) setActive(i);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);

  return (
    <div>
      <ul className="scrollbar-none mb-6 flex gap-4 overflow-x-auto" role="tablist">
        {tabs.map((t, i) => (
          <li key={t}>
            <button
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={`h-11 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${active === i ? "bg-[rgba(161,15,228,0.08)] text-brand-600" : "text-muted hover:text-ink"}`}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>
      {panels.map((p, i) => (
        <div key={i} role="tabpanel" hidden={active !== i} id={tabs[i].toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24 rounded-3xl border border-line">
          <h5 className="rounded-t-3xl bg-well px-6 py-4 font-heading text-xl font-bold text-ink">{tabs[i]}</h5>
          <div className="p-6">{p}</div>
        </div>
      ))}
    </div>
  );
}
