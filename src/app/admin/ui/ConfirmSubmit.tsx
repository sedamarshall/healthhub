"use client";

import { confirmDialog, toneFor, type ConfirmTone } from "@/components/ConfirmDialog";

/** A submit button that asks for confirmation first (for destructive one-click actions). */
export function ConfirmSubmit({ message, title, confirmLabel, cancelLabel, tone, className, children }: { message: string; title?: string; confirmLabel?: string; cancelLabel?: string; tone?: ConfirmTone; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button" // never submits on its own, only after Confirm in the dialog
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        const button = e.currentTarget;
        const label = typeof children === "string" ? children : "Confirm";
        const ok = await confirmDialog({ title: title ?? message, message: title ? message : undefined, confirmLabel: confirmLabel ?? label, cancelLabel, tone: tone ?? toneFor(label) });
        if (ok) button.form?.requestSubmit();
      }}
    >
      {children}
    </button>
  );
}
