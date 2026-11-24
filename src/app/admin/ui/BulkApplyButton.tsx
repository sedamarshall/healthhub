"use client";

import { confirmDialog } from "@/components/ConfirmDialog";

/**
 * "Apply" for bulk actions: tells you to tick rows first if none are selected,
 * otherwise confirms "Archive 5 products?" before submitting.
 */
export function BulkApplyButton({ formId, field = "ids", noun = "product", className }: { formId: string; field?: string; noun?: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        const form = document.getElementById(formId) as HTMLFormElement | null;
        if (!form) return;
        const count = document.querySelectorAll(`input[name="${field}"][form="${formId}"]:checked`).length;
        if (!count) {
          await confirmDialog({ title: `Select at least one ${noun}`, message: `Tick the ${noun}s you want to change in the list, then press Apply.`, alertOnly: true, tone: "default" });
          return;
        }
        const select = form.querySelector("select") as HTMLSelectElement | null;
        const action = select?.selectedOptions[0]?.textContent ?? "Apply";
        const ok = await confirmDialog({ title: `${action}: ${count} ${noun}${count === 1 ? "" : "s"}?`, message: "You can change these back later.", confirmLabel: "Apply", tone: /archive|draft/i.test(action) ? "warning" : "success" });
        if (ok) form.requestSubmit();
      }}
    >
      Apply
    </button>
  );
}
