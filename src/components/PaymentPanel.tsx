"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { payWithIpay } from "@/app/actions/pay";

/** Send the browser to iPay (or the dev test page) with the signed fields. */
function submitTo(action: string, method: "POST" | "GET", fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = method;
  form.action = action;
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  }
  document.body.appendChild(form);
  form.submit();
}

const Chip = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <span className="rounded-md px-2 py-1 text-[10px] font-black text-white" style={{ background: bg }}>{children}</span>
);

/** "Pay with iPay" box on the order page: M-Pesa, Airtel Money or card on iPay's secure page. */
export function PaymentPanel({ number, token, total, awaiting = false, autoStart = false }: { number: string; token: string; total: string; awaiting?: boolean; autoStart?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const started = useRef(false);

  const pay = () =>
    start(async () => {
      setMsg(null);
      const r = await payWithIpay(number, token);
      if (r.ok) submitTo(r.action, r.method, r.fields);
      else setMsg(r.message);
    });

  // Right after "Confirm Order", go straight to iPay (once per order, so Back doesn't loop).
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    const key = `hh-ipay-auto-${number}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    pay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, number]);

  return (
    <div className="rounded-2xl border border-line p-5 sm:p-6">
      <h2 className="font-heading text-xl font-bold">Pay {total}</h2>
      <p className="mt-1 text-[15px] text-muted">You&apos;ll be taken to iPay&apos;s secure page to pay with M-Pesa, Airtel Money or a Visa / Mastercard card, then brought back here.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip bg="#4caf50">M-PESA</Chip>
        <Chip bg="#e40000">AIRTEL MONEY</Chip>
        <Chip bg="#1a1f71">VISA</Chip>
        <Chip bg="#eb001b">MASTERCARD</Chip>
      </div>
      {awaiting && <p className="mt-4 rounded-lg bg-accent-soft p-3 text-sm" role="status">We&apos;re waiting for iPay to confirm your last payment attempt. If you completed it, this page will show it as paid shortly. Otherwise you can pay again below.</p>}
      {msg && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-sale" role="alert">{msg}</p>}
      <button type="button" onClick={pay} disabled={pending} className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-[15px] font-semibold text-white shadow-[0_8px_16px_rgba(161,15,228,0.24)] hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Opening iPay…" : `Pay ${total} with iPay`}
      </button>
      <p className="mt-3 text-center text-xs text-muted">Secured by iPay Africa</p>
    </div>
  );
}
