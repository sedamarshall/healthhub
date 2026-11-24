"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal], .section-title";

/**
 * Scroll reveal like the reference shop: elements start 30px lower and transparent, then
 * fade up as they enter the screen. Elements that enter together are staggered slightly.
 * CSS lives in globals.css under `.reveal-on`; that class is only set when JS runs and the
 * visitor has not asked for reduced motion, so nothing is ever hidden without JS.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("reveal-on");
      return;
    }
    root.classList.add("reveal-on");

    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.transitionDelay = `${Math.min(n++, 6) * 70}ms`;
          el.classList.add("is-in");
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.08 },
    );

    const watch = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>(SELECTOR).forEach(track);
    };
    // Cards inside sideways-scrolling rails show straight away (they'd otherwise wait for a sideways scroll).
    const track = (el: HTMLElement) => {
      if (el.classList.contains("is-in")) return;
      if (el.parentElement?.closest(".overflow-x-auto")) el.classList.add("is-in");
      else io.observe(el);
    };
    watch(document);

    // Product tabs, drawers etc. add cards later: watch those too.
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(SELECTOR)) track(node);
        watch(node);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return null;
}
