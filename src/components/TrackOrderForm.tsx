"use client";

import { useActionState } from "react";
import { trackOrder, type TrackState } from "@/app/actions/track";
import { Field } from "./Field";

export function TrackOrderForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, {});
  return (
    <form action={action} className="space-y-4 p-6 sm:p-8">
      <p className="text-muted">Enter your order number (from your confirmation email) and the phone number you used at checkout.</p>
      <Field label="Order number, e.g. HH2611241234" name="number" required autoComplete="off" defaultValue={state.number} />
      <Field label="Phone number" name="phone" type="tel" inputMode="tel" required autoComplete="tel" defaultValue={state.phone} />
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-sale" role="alert">{state.error}</p>}
      <button disabled={pending} className="flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-[15px] font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Finding your order…" : "Track Order"}
      </button>
    </form>
  );
}
