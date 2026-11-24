"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, ArrowRight02Icon, Cancel01Icon, Delete02Icon, RemoveCircleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { applyCoupon, clearCart, updateCartItem } from "@/app/actions/cart";
import { confirmDialog } from "./ConfirmDialog";

export function CartQty({ itemId, qty, max }: { itemId: number; qty: number; max: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (n: number) =>
    start(async () => {
      await updateCartItem(itemId, n);
      router.refresh();
    });
  return (
    <div className={`flex w-[108px] items-center justify-between rounded-[80px] border border-line px-4 py-2.5 ${pending ? "opacity-50" : ""}`}>
      <button type="button" onClick={() => set(qty - 1)} disabled={pending || qty <= 1} aria-label="Decrease quantity" className="text-ink disabled:opacity-30"><HugeiconsIcon icon={RemoveCircleIcon} size={20} /></button>
      <input readOnly value={qty} aria-label="Quantity" aria-live="polite" className="w-6 bg-transparent text-center text-base font-semibold outline-none" />
      <button type="button" onClick={() => set(qty + 1)} disabled={pending || qty >= max} aria-label="Increase quantity" className="text-ink disabled:opacity-30"><HugeiconsIcon icon={AddCircleIcon} size={20} /></button>
    </div>
  );
}

export function RemoveItem({ itemId }: { itemId: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remove item"
      onClick={() =>
        start(async () => {
          await updateCartItem(itemId, 0);
          router.refresh();
        })
      }
      className="text-ink hover:text-sale disabled:opacity-40"
    >
      <HugeiconsIcon icon={Delete02Icon} size={22} />
    </button>
  );
}

export function RemoveAll() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirmDialog({ title: "Remove everything from your cart?", message: "All items will be taken out of your cart. You can add them again any time.", confirmLabel: "Remove All", tone: "danger" });
        if (!ok) return;
        start(async () => {
          await clearCart();
          router.refresh();
        });
      }}
      className="flex items-center gap-1.5 text-base font-semibold text-[#ff4842] transition hover:opacity-80 disabled:opacity-50"
    >
      <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
      Remove All
    </button>
  );
}

export function CouponForm({ applied }: { applied?: string }) {
  const [code, setCode] = useState(applied ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (value: string) =>
    start(async () => {
      const r = await applyCoupon(value);
      setMsg({ ok: r.ok, text: r.message });
      router.refresh();
    });
  return (
    <div>
      <div className="relative">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && code.trim() && !applied && run(code)} placeholder="Coupon Code" aria-label="Coupon code" readOnly={!!applied} className="w-full rounded-[100px] border border-line bg-white py-3 pe-28 ps-3.5 text-base uppercase text-ink outline-none transition placeholder:normal-case placeholder:text-faint focus:border-ink" />
        {applied ? (
          <button type="button" onClick={() => { setCode(""); run(""); }} disabled={pending} className="absolute inset-y-0 right-0 rounded-r-[100px] bg-well px-[22px] text-base font-semibold text-ink">Remove</button>
        ) : (
          <button type="button" onClick={() => run(code)} disabled={pending || !code.trim()} className="absolute inset-y-0 right-0 rounded-r-[100px] bg-brand-600 px-[22px] text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">Apply</button>
        )}
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-brand-600" : "text-sale"}`} role="status">{msg.text}</p>}
    </div>
  );
}

/** Reference-style checkbox: 20px square, 40px round hover halo, primary fill + tick when checked. */
export function Checkbox({ checked, onChange, children, name }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; name?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-1 text-base text-ink">
      <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${checked ? "hover:bg-[rgba(161,15,228,0.08)]" : "hover:bg-[rgba(145,158,171,0.08)]"}`}>
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer absolute inset-0 cursor-pointer opacity-0" />
        <span className={`flex size-5 items-center justify-center rounded-[5px] border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/40 ${checked ? "border-brand-600 bg-brand-600 text-white" : "border-[#637381]"}`}>
          {checked && <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={3} />}
        </span>
      </span>
      <span>{children}</span>
    </label>
  );
}

/** Terms checkbox, Proceed (enabled once terms are accepted) and Continue Shopping, as in the reference. */
export function ProceedToCheckout({ disabled }: { disabled?: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const ok = agreed && !disabled;
  return (
    <>
      <Checkbox checked={agreed} onChange={setAgreed}>
        I agree with the <Link href="/terms" className="font-semibold text-brand-600 underline">Terms</Link> and <Link href="/privacy-policy" className="font-semibold text-brand-600 underline">Conditions</Link>
      </Checkbox>
      <div className="flex flex-col gap-y-4">
        <Link
          href={ok ? "/checkout" : "#"}
          aria-disabled={!ok}
          onClick={(e) => !ok && e.preventDefault()}
          className={`flex w-full items-center justify-center rounded-[80px] py-3 text-base font-semibold transition ${ok ? "bg-brand-600 text-white shadow-[0_8px_16px_rgba(161,15,228,0.24)] hover:bg-brand-700" : "cursor-not-allowed bg-[rgba(145,158,171,0.24)] text-[rgba(145,158,171,0.8)]"}`}
        >
          Proceed to checkout
        </Link>
        <Link href="/search" className="flex w-full items-center justify-center gap-2 rounded-[80px] border border-line py-[11px] text-base font-semibold text-ink transition hover:border-ink hover:bg-well">
          Continue Shopping <HugeiconsIcon icon={ArrowRight02Icon} size={20} />
        </Link>
      </div>
    </>
  );
}
