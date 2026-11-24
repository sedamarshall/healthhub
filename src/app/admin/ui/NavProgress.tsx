"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Purple bar at the top of the admin while a link or filter is loading. */
export function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);

  // Start on any internal link click or GET form submit (filters, search).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/admin/export")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setBusy(true);
    };
    const onSubmit = (e: SubmitEvent) => {
      // getAttribute, not f.method: a field named "method" would shadow the property.
      const f = e.target as HTMLFormElement;
      if ((f.getAttribute("method") || "get").toLowerCase() === "get" && !f.getAttribute("action")?.startsWith("javascript:")) setBusy(true);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("submit", onSubmit); };
  }, []);

  // Done when the URL has changed.
  useEffect(() => setBusy(false), [pathname, params]);

  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-300 ${busy ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full w-1/3 animate-[navbar_1.1s_ease-in-out_infinite] rounded-full bg-[#a10fe4]" />
    </div>
  );
}
