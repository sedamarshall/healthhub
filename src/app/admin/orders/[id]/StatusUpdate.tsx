"use client";

import { useState } from "react";
import { confirmDialog } from "@/components/ConfirmDialog";
import { updateOrderStatus } from "../../actions";

/**
 * "Move to: …" + Update on the order page. The confirmation names the status the order is moving to,
 * and cancelling is shown as a red, destructive step. Mount it with key={order.status} so the choice
 * resets to the first valid option whenever the status changes (e.g. right after "Mark as paid").
 */
export function StatusUpdate({ orderId, number, options, paid }: { orderId: number; number: string; options: { value: string; label: string }[]; paid: boolean }) {
  const [value, setValue] = useState(options[0]?.value ?? "");
  const label = options.find((o) => o.value === value)?.label ?? value;

  const ask = async (form: HTMLFormElement) => {
    const cancel = value === "cancelled";
    const ok = await confirmDialog({
      title: cancel ? `Cancel order #${number}?` : `Move order #${number} to "${label}"?`,
      message: cancel
        ? `Items go back into stock and the customer is emailed that the order was cancelled.${paid ? " This order is PAID: record a refund under Return & Refund after cancelling." : ""}`
        : "The customer gets an email about this status.",
      confirmLabel: cancel ? "Cancel order" : `Move to ${label}`,
      cancelLabel: cancel ? "Keep order" : "Back",
      tone: cancel ? "danger" : "success",
    });
    if (ok) form.requestSubmit();
  };

  return (
    <form action={updateOrderStatus} className="flex items-center gap-2">
      <input type="hidden" name="id" value={orderId} />
      <select name="status" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Move order to" className="h-9 rounded-full bg-[#f4f6f8] px-3 text-sm outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>Move to: {o.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={(e) => ask(e.currentTarget.form!)}
        className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-bold text-white ${value === "cancelled" ? "bg-[#cb0233] hover:bg-[#a4022a]" : "bg-[#a10fe4] hover:bg-[#850cbd]"}`}
      >
        {value === "cancelled" ? "Cancel order" : "Update"}
      </button>
    </form>
  );
}
