"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestReset, resetPassword, type ResetState } from "@/app/actions/password";
import { Field } from "./Field";

const btn = "flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-[15px] font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700 disabled:opacity-60";

export function ForgotForm() {
  const [s, action, pending] = useActionState<ResetState, FormData>(requestReset, {});
  if (s.ok) return <p className="rounded-2xl bg-brand-50 p-4 text-[15px] text-brand-700">{s.ok}</p>;
  return (
    <form action={action} className="space-y-4">
      <p className="text-muted">Enter the email you use for your account and we&apos;ll send you a link to choose a new password.</p>
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      {s.error && <p className="text-sm text-sale">{s.error}</p>}
      <button disabled={pending} className={btn}>{pending ? "Sending…" : "Send reset link"}</button>
      <p className="text-center text-[15px] text-muted"><Link href="/login" className="font-semibold text-brand-600">Back to login</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  if (s.ok) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-brand-50 p-4 text-[15px] text-brand-700">{s.ok}</p>
        <Link href="/login" className={btn}>Login</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password (8+ characters)" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <Field label="Confirm new password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      {s.error && <p className="text-sm text-sale">{s.error}</p>}
      <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
