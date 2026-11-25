"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { CartHi } from "./Hi";
import { openCartDrawer } from "./CartDrawer";

export function AddToCartButton({
  productId,
  disabled,
  label = "Add to Cart",
  withQty = false,
  max = 20,
  compact = false,
  buyNow = false,
  compactMobile = false,
  className = "",
}: {
  productId: number;
  disabled?: boolean;
  label?: string;
  withQty?: boolean;
  max?: number;
  compact?: boolean;
  buyNow?: boolean;
  /** Product cards: smaller button, and the short label "Add" whenever the card is narrow (phones, 6-column grids). */
  compactMobile?: boolean;
  className?: string;
}) {
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const add = (thenCheckout = false) =>
    start(async () => {
      const r = await addToCart(productId, qty);
      if (r.ok && thenCheckout) {
        router.push("/checkout");
        return;
      }
      setMsg({ ok: r.ok, text: r.message });
      router.refresh();
      setTimeout(() => setMsg(null), 2500);
    });

  if (buyNow) {
    // Reference layout: [ - 1 + ] [ Buy Now ] [ Add to Cart ] on one row (wraps on phones)
    return (
      <div className={`relative ${className}`}>
        <div className="flex flex-wrap items-center gap-4 md:flex-nowrap">
          <div className="flex h-12 max-w-[185px] flex-1 items-center justify-between rounded-[80px] border border-line px-4">
            <button type="button" className="text-ink disabled:opacity-30" disabled={disabled || qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
            </button>
            <input
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value.replace(/\D/g, "")) || 1)))}
              inputMode="numeric"
              aria-label="Quantity"
              disabled={disabled}
              className="w-12 bg-transparent text-center text-base font-semibold leading-6 text-ink outline-none"
            />
            <button type="button" className="text-ink disabled:opacity-30" disabled={disabled || qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Increase quantity">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>
            </button>
          </div>
          <button type="button" onClick={() => add(true)} disabled={disabled || pending} className="h-12 flex-1 whitespace-nowrap rounded-[80px] bg-accent px-5 text-base font-semibold leading-[26px] text-[#212b36] transition-colors hover:bg-[#17a690] disabled:cursor-not-allowed disabled:opacity-50">
            Buy Now
          </button>
          <button
            type="button"
            onClick={() => add()}
            disabled={disabled || pending}
            className={`flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[80px] px-5 text-base font-semibold leading-[26px] transition-colors md:w-auto md:flex-1 ${disabled ? "cursor-not-allowed bg-well text-faint" : "bg-brand-600 text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700"}`}
          >
            {!disabled && <CartHi size={20} />}
            {disabled ? "Out of stock" : pending ? "Adding…" : "Add to Cart"}
          </button>
        </div>
        {msg && (
          <p className={`mt-2 text-sm ${msg.ok ? "text-brand-600" : "text-sale"}`} role="status">
            {msg.text} {msg.ok && <button type="button" onClick={openCartDrawer} className="ml-1 font-semibold underline">View cart</button>}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-3">
        {withQty && !disabled && (
          <div className="flex h-12 items-center rounded-full border border-line bg-white">
            <button type="button" className="h-12 w-11 text-lg text-muted hover:text-ink" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
            <button type="button" className="h-12 w-11 text-lg text-muted hover:text-ink" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Increase quantity">+</button>
          </div>
        )}
        <button
          type="button"
          onClick={() => add()}
          disabled={disabled || pending}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 ${compact ? "h-9 px-3 text-[13px] leading-6" : withQty ? "h-12 px-6 text-[15px]" : compactMobile ? "h-9 gap-1.5 px-2 text-[13px] leading-6 sm:h-11 sm:gap-2 sm:px-3 sm:text-sm" : "h-11 px-3 py-2 text-sm leading-6"} ${
            disabled ? "cursor-not-allowed bg-well text-faint" : "bg-brand-600 text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700"
          }`}
        >
          {!disabled && <CartHi size={compact || compactMobile ? 18 : 20} />}
          {disabled ? "Out of stock" : pending ? "Adding…" : compactMobile ? <><span className="@[230px]:hidden">Add</span><span className="hidden @[230px]:inline">{label}</span></> : label}
        </button>
      </div>
      {msg && (
        <p className={`absolute left-0 right-0 top-full mt-1 text-center text-xs ${msg.ok ? "text-brand-600" : "text-sale"}`} role="status">
          {msg.text}
          {msg.ok && withQty && <button type="button" onClick={openCartDrawer} className="ml-1 font-semibold underline">View cart</button>}
        </p>
      )}
    </div>
  );
}
