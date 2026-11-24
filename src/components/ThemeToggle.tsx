"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";

export const THEME_KEY = "hh-theme";

/** Runs in <head> before first paint so the page never flashes the wrong theme. Light unless the visitor chose dark. */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

/**
 * Light / dark switch. Light by default; dark only when the visitor turns it on (remembered on this device).
 * Used in the shop header and the admin top bar.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch {}
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${className}`}
    >
      {/* Light is the default, so the moon ("switch to dark") is right before hydration. */}
      <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} size={22} strokeWidth={1.6} />
    </button>
  );
}
