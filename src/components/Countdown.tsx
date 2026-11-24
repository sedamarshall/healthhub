"use client";

import { useEffect, useState } from "react";

/** Counts down to the end of the current week (Sunday 23:59:59, shopper's local time). */
export function WeekCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date();
    end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
    end.setHours(23, 59, 59, 999);
    const tick = () => setLeft(Math.max(0, end.getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((left ?? 0) / 1000);
  const parts = [
    [Math.floor(s / 86400), "Days"],
    [Math.floor((s % 86400) / 3600), "Hours"],
    [Math.floor((s % 3600) / 60), "Mins"],
    [s % 60, "Secs"],
  ] as const;
  return (
    <div className="flex gap-3" aria-label="Time left for this week's deals">
      {parts.map(([v, l]) => (
        <div key={l} className="flex h-[72px] w-[68px] flex-col items-center justify-center rounded-xl bg-white text-ink shadow-sm">
          <span className="font-heading text-2xl font-bold">{left === null ? "--" : String(v).padStart(2, "0")}</span>
          <span className="text-xs text-muted">{l}</span>
        </div>
      ))}
    </div>
  );
}
