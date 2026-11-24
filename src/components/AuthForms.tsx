"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, register, type AuthState } from "@/app/actions/auth";
import { Field } from "./Field";

const btn = "flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(161,15,228,0.25)] hover:bg-brand-700 disabled:opacity-60";

export function LoginForm({ next, onSwitch }: { next?: string; onSwitch?: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={state.email} />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <div className="text-right"><Link href="/forgot-password" className="text-sm font-semibold text-brand-600">Forgot password?</Link></div>
      {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
      <button className={btn} disabled={pending}>{pending ? "Signing in…" : "Login"}</button>
      <p className="text-center text-[15px] text-muted">
        Don&apos;t have an account?{" "}
        {onSwitch ? <button type="button" onClick={onSwitch} className="font-semibold text-brand-600">Sign Up</button> : <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600">Create Account</Link>}
      </p>
    </form>
  );
}

export function RegisterForm({ next, onSwitch }: { next?: string; onSwitch?: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Full name" name="name" required autoComplete="name" defaultValue={state.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={state.email} />
      <Field label="Phone number" name="phone" type="tel" inputMode="tel" required autoComplete="tel" defaultValue={state.phone} />
      <Field label="Password (8+ characters)" name="password" type="password" minLength={8} required autoComplete="new-password" />
      {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
      <button className={btn} disabled={pending}>{pending ? "Creating account…" : "Create Account"}</button>
      <p className="text-center text-[15px] text-muted">
        Already have an account?{" "}
        {onSwitch ? <button type="button" onClick={onSwitch} className="font-semibold text-brand-600">Log In</button> : <Link href="/login" className="font-semibold text-brand-600">Login</Link>}
      </p>
    </form>
  );
}
