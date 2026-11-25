"use client";

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("turnstile")); };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Cloudflare Turnstile check (usually invisible; sometimes a one-click box). Adds the hidden
 * "cf-turnstile-response" field to the surrounding form. Renders nothing when no site key is set.
 * Change `resetKey` to get a fresh token after a failed submit.
 */
export function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let id: string | undefined;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, { sitekey: SITE_KEY, appearance: "interaction-only", theme: document.documentElement.classList.contains("dark") ? "dark" : "light" });
      })
      .catch(() => {});
    return () => { gone = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, [resetKey]);
  if (!SITE_KEY) return null;
  return <div ref={box} className="min-h-0 [&_iframe]:max-w-full" />;
}
