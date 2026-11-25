"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/actions/auth";
import { Turnstile } from "@/components/Turnstile";

const input = "peer block h-14 w-full appearance-none rounded-full border border-[rgba(145,158,171,0.2)] bg-transparent px-3.5 py-4 text-sm text-ink focus:border-brand-600 focus:outline-none";
const label = "pointer-events-none absolute left-3.5 top-2 z-10 origin-left -translate-y-4 scale-75 bg-white px-1 text-sm text-brand-600 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-placeholder-shown:bg-transparent peer-placeholder-shown:text-faint peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:bg-white peer-focus:text-brand-600";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="rememberField" value="1" />
      <div className="relative">
        <input id="si-email" name="email" type="email" placeholder=" " required autoComplete="username" defaultValue={state.email} className={input} />
        <label htmlFor="si-email" className={label}>Email</label>
      </div>
      <div className="relative">
        <input id="si-password" name="password" type={show ? "text" : "password"} placeholder=" " required autoComplete="current-password" className={`${input} pr-16`} />
        <label htmlFor="si-password" className={label}>Password</label>
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <span className="relative inline-flex items-center">
            <input type="checkbox" name="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
            <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-[#637381] text-white transition-all peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/40 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </span>
          </span>
          <span className="text-sm font-medium text-muted">Keep me signed in</span>
        </label>
        <Link href="/forgot-password" className="text-[13px] font-bold text-brand-600 hover:text-brand-700">Forgot password?</Link>
      </div>
      {state.captcha && <Turnstile resetKey={state} />}
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-sale" role="alert">{state.error}</p>}
      <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(161,15,228,0.24)] transition-colors hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
