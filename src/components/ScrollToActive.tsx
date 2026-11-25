"use client";

import { useEffect } from "react";

/** Scrolls a horizontal row so its selected item (aria-current="page") is in view, e.g. the active category pill. */
export function ScrollToActive({ target }: { target: string }) {
  useEffect(() => {
    const run = () => {
      const row = document.getElementById(target);
      const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!row || !active) return;
      // The row is position:relative, so offsetLeft is measured from its start. Jump (no smooth scroll),
      // which page-load work could otherwise cancel half-way.
      row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: "instant" });
    };
    const raf = requestAnimationFrame(run);
    const t = setTimeout(run, 400); // again once images and fonts have settled
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [target]);
  return null;
}
