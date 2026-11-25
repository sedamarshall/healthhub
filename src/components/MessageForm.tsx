"use client";

import { useActionState } from "react";
import { sendMessage, type MsgState } from "@/app/actions/messages";
import { Field, FieldArea } from "./Field";
import { Turnstile } from "./Turnstile";

/** Contact form / "Give us feedback" form. */
export function MessageForm({ kind = "contact", orderId, defaults }: { kind?: "contact" | "feedback"; orderId?: number; defaults?: { name?: string; email?: string } }) {
  const [s, action, pending] = useActionState<MsgState, FormData>(sendMessage, {});
  if (s.ok) return <p className="rounded-2xl bg-brand-50 p-4 text-[15px] text-brand-700">{s.ok}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {kind === "feedback" ? (
        <FieldArea label="Share your experience*" name="body" rows={4} required />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" name="name" required defaultValue={defaults?.name} />
        <Field label="Email *" name="email" type="email" required defaultValue={defaults?.email} />
        {kind === "contact" && <Field label="Phone" name="phone" type="tel" />}
        {kind === "contact" && <Field label="Subject" name="subject" />}
      </div>
      {kind === "contact" && <FieldArea label="Message *" name="body" rows={5} required />}
      <Turnstile resetKey={s} />
      {s.error && <p className="text-sm text-sale" role="alert">{s.error}</p>}
      <button disabled={pending} className="h-12 rounded-full bg-brand-600 px-8 text-[15px] font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Sending…" : kind === "feedback" ? "Send Now" : "Send Message"}
      </button>
    </form>
  );
}
