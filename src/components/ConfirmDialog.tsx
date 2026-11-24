"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

export type ConfirmTone = "danger" | "warning" | "success" | "default";
export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Info-only dialog with a single button (e.g. "Select a product first"). */
  alertOnly?: boolean;
};

const ICON: Record<ConfirmTone, { path: string; ring: string; color: string }> = {
  danger: { path: "M4 7h16M10 11v6M14 11v6M6 7l1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7", ring: "bg-[rgba(255,72,66,0.12)]", color: "text-[#cb0233]" },
  warning: { path: "M12 9v4M12 17h.01M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", ring: "bg-[rgba(255,193,7,0.16)]", color: "text-[#b78103]" },
  success: { path: "M20 6 9 17l-5-5", ring: "bg-[rgba(161,15,228,0.12)]", color: "text-[#a10fe4]" },
  default: { path: "M12 8v4M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", ring: "bg-[rgba(161,15,228,0.12)]", color: "text-[#a10fe4]" },
};

/** Confirmation dialog in the reference dashboard's style (small centred card, Cancel / Confirm pills). */
function Dialog({ opts, onClose }: { opts: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const [shown, setShown] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const tone = opts.tone ?? "default";
  const icon = ICON[tone];

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(r); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = (ok: boolean) => {
    setShown(false);
    setTimeout(() => onClose(ok), 180);
  };

  return (
    <div className="fixed inset-0 z-[200]" role="presentation">
      <div className={`fixed inset-0 bg-gray-900/30 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} onClick={() => close(false)} aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={opts.message ? "confirm-text" : undefined}
            className={`w-full max-w-[360px] rounded-2xl bg-white p-5 text-center shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)] transition-all duration-300 ease-out sm:p-6 ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
          >
            <div className="mb-5 flex justify-center">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${icon.ring} ${icon.color}`}>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon.path} /></svg>
              </span>
            </div>
            <h3 id="confirm-title" className="mb-2 text-base font-semibold leading-6 text-[#212529]">{opts.title}</h3>
            {opts.message && <p id="confirm-text" className="mb-6 text-sm leading-[22px] text-[#637381]">{opts.message}</p>}
            {!opts.message && <div className="mb-6" />}
            <div className="flex items-center justify-center gap-2.5">
              {!opts.alertOnly && (
                <button type="button" onClick={() => close(false)} className="inline-flex h-10 min-w-[110px] items-center justify-center rounded-full border border-[rgba(145,158,171,0.32)] px-5 text-sm font-bold text-[#212529] transition-colors hover:bg-[#f9fafb]">
                  {opts.cancelLabel ?? "Cancel"}
                </button>
              )}
              <button
                ref={confirmRef}
                type="button"
                onClick={() => close(true)}
                className={`inline-flex h-10 min-w-[110px] items-center justify-center rounded-full px-5 text-sm font-bold text-white transition-colors ${tone === "danger" ? "bg-[#cb0233] hover:bg-[#a30229]" : "bg-[#a10fe4] hover:bg-[#850cbd]"}`}
              >
                {opts.confirmLabel ?? (opts.alertOnly ? "OK" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ask the user to confirm. Resolves true for Confirm, false for Cancel / Escape / clicking outside. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const done = (ok: boolean) => {
      root.unmount();
      host.remove();
      document.body.style.overflow = prevOverflow;
      resolve(ok);
    };
    root.render(<Dialog opts={opts} onClose={done} />);
  });
}

/** Pick a tone from the action wording, so "Delete…" is red and "Approve…" is purple. */
export function toneFor(text: string): ConfirmTone {
  const t = text.toLowerCase();
  if (/^(delete|remove|reject|cancel|deactivate|archive)/.test(t)) return "danger";
  if (/^(approve|activate|mark as refunded|publish)/.test(t)) return "success";
  return "warning";
}
