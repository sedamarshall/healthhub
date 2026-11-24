"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { MultiplicationSignIcon } from "@hugeicons/core-free-icons";

/**
 * Right-hand floating panel like the reference shop's cart / log-in sidebars:
 * dark overlay, panel slides in from 200px to the right while fading in.
 * On xl screens it floats 30px from the top and 22px from the right with rounded corners.
 */
export function SidePanel({ open, onClose, width = "max-w-[600px]", label, children }: {
  open: boolean;
  onClose: () => void;
  width?: string;
  label: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <>
      <div onClick={onClose} className={`fixed inset-0 z-[90] bg-black/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`fixed right-0 top-0 z-[99] h-full w-full ${width} overflow-hidden bg-white shadow-[-24px_0_40px_-4px_rgba(145,158,171,0.24)] outline-none transition-all duration-300 ease-out xl:right-[22px] xl:top-[30px] xl:h-[calc(100vh-52px)] xl:rounded-2xl ${shown ? "translate-x-0 opacity-100" : "translate-x-[200px] opacity-0"}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export function PanelClose({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close" className="absolute right-6 top-6 flex size-9 items-center justify-center rounded-full bg-[rgba(145,158,171,0.08)] text-ink transition hover:bg-[rgba(145,158,171,0.2)]">
      <HugeiconsIcon icon={MultiplicationSignIcon} size={20} strokeWidth={1.8} />
    </button>
  );
}

export function PanelHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-line px-6 pb-4 pt-6 pr-20">
      <h5 className="font-heading text-xl font-bold leading-[30px] text-ink">{title}</h5>
      {sub && <p className="text-base text-muted">{sub}</p>}
    </div>
  );
}
