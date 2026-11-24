"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, Delete02Icon, PencilEdit02Icon, RemoveCircleIcon } from "@hugeicons/core-free-icons";
import { addToCart, loadCartDrawer, removeCartItem, updateCartItem, type DrawerItem, type DrawerProduct } from "@/app/actions/cart";
import { kes } from "@/lib/utils";
import { CartIcon } from "./Icons";
import { CartHi } from "./Hi";
import { PanelClose, PanelHead, SidePanel } from "./SidePanel";

type Data = { items: DrawerItem[]; subtotal: number; count: number; similar: DrawerProduct[] };

/** Fire this anywhere (e.g. after "Add to Cart") to open the header cart drawer. */
export const openCartDrawer = () => window.dispatchEvent(new Event("hh:cart-open"));

/** Header cart button + the reference two-column cart drawer (similar products | cart products). */
export function CartButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();

  const load = useCallback(() => start(async () => setData(await loadCartDrawer())), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => { setOpen(true); load(); };
    window.addEventListener("hh:cart-open", onOpen);
    return () => window.removeEventListener("hh:cart-open", onOpen);
  }, [load]);

  const mutate = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      setData(await loadCartDrawer());
      router.refresh();
    });

  const n = data?.count ?? count;

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); load(); }} className="group flex items-center gap-2.5" aria-label={`Cart, ${count} items`} aria-haspopup="dialog">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white lg:h-11 lg:w-11">
          <CartIcon />
          {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white lg:hidden">{count}</span>}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-xs text-muted">Cart</span>
          <span className="block text-[15px] text-ink">{count}- Items</span>
        </span>
      </button>

      <SidePanel open={open} onClose={close} width="max-w-[1101px]" label="Shopping cart">
        <div className="flex h-full">
          {/* Similar products (desktop only, as in the reference) */}
          <div className="hidden h-full w-full max-w-[500px] border-r border-line xl:block">
            <PanelHead title="Similar Products" sub="You May Also Like" />
            <div className="flex h-[calc(100%-100px)] flex-col gap-y-4 overflow-y-auto p-6">
              {!data && <Skeletons />}
              {data?.similar.map((p) => (
                <div key={p.id} className="flex gap-x-4 rounded-2xl border border-line p-4">
                  <Link href={`/p/${p.slug}`} onClick={close} className="relative size-[102px] shrink-0 overflow-hidden rounded-xl bg-[#f4f3f5]">
                    {p.image && <Image src={p.image} alt="" fill sizes="102px" className="object-contain p-2 mix-blend-multiply" />}
                    {p.onSale && <span className="absolute left-0 top-2 rounded-r-full bg-sale px-2 py-0.5 text-xs font-semibold text-white">Sale</span>}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                    <div>
                      <Link href={`/p/${p.slug}`} onClick={close}><h6 className="line-clamp-2 text-base font-semibold leading-6 text-ink hover:text-brand-600">{p.name}</h6></Link>
                      {p.brand && <p className="truncate text-sm text-muted">{p.brand}</p>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-x-2">
                        <span className="text-base font-semibold text-ink">{kes(p.price)}</span>
                        {p.oldPrice && <span className="text-base text-faint line-through">{kes(p.oldPrice)}</span>}
                      </p>
                      <button type="button" disabled={busy} onClick={() => mutate(() => addToCart(p.id, 1))} className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
                        <CartHi size={16} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart products */}
          <div className="relative flex h-full w-full flex-col justify-between xl:max-w-[600px]">
            <PanelHead title="Cart Products" sub={`${n} ${n === 1 ? "Item" : "Items"} in Cart`} />
            <PanelClose onClick={close} />
            <div className={`flex flex-1 flex-col gap-y-4 overflow-y-auto p-6 transition-opacity ${busy && data ? "opacity-60" : ""}`}>
              {!data && <Skeletons />}
              {data && data.items.length === 0 && (
                <div className="py-16 text-center">
                  <p className="font-heading text-xl font-bold text-ink">Your cart is empty</p>
                  <p className="mt-1 text-muted">Add a few things and they&apos;ll show up here.</p>
                  <Link href="/search" onClick={close} className="mt-6 inline-flex rounded-[80px] bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">Start Shopping</Link>
                </div>
              )}
              {data?.items.map((i) => (
                <div key={i.id} className="flex gap-x-4 rounded-2xl border border-line p-4">
                  <Link href={`/p/${i.slug}`} onClick={close} className="relative size-[102px] shrink-0 overflow-hidden rounded-xl bg-[#f4f3f5]">
                    {i.image && <Image src={i.image} alt="" fill sizes="102px" className="object-contain p-2 mix-blend-multiply" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/p/${i.slug}`} onClick={close} className="min-w-0"><h6 className="line-clamp-2 text-base font-semibold leading-6 text-ink hover:text-brand-600">{i.name}</h6></Link>
                      <div className="flex shrink-0 gap-x-3 text-xl text-muted">
                        <Link href={`/p/${i.slug}`} onClick={close} aria-label={`View ${i.name}`} className="hover:text-brand-600"><HugeiconsIcon icon={PencilEdit02Icon} size={20} /></Link>
                        <button type="button" disabled={busy} onClick={() => mutate(() => removeCartItem(i.id))} aria-label={`Remove ${i.name}`} className="hover:text-sale"><HugeiconsIcon icon={Delete02Icon} size={20} /></button>
                      </div>
                    </div>
                    {i.rx && <p className="text-sm text-muted">Prescription required</p>}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-x-2">
                        <span className="text-base font-semibold text-ink">{kes(i.price)}</span>
                        {i.oldPrice && <span className="text-base text-faint line-through">{kes(i.oldPrice)}</span>}
                      </p>
                      <div className="flex w-full max-w-[108px] items-center justify-between rounded-[80px] border border-line px-4 py-2.5">
                        <button type="button" disabled={busy} onClick={() => mutate(() => updateCartItem(i.id, i.qty - 1))} aria-label="Decrease quantity" className="text-ink disabled:opacity-40"><HugeiconsIcon icon={RemoveCircleIcon} size={22} /></button>
                        <input readOnly value={i.qty} aria-label="Quantity" className="w-6 bg-transparent text-center text-base font-semibold outline-none" />
                        <button type="button" disabled={busy || i.qty >= i.max} onClick={() => mutate(() => updateCartItem(i.id, i.qty + 1))} aria-label="Increase quantity" className="text-ink disabled:opacity-40"><HugeiconsIcon icon={AddCircleIcon} size={22} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-y-4 border-t border-line p-6">
              <div className="flex items-center justify-between">
                <h5 className="font-heading text-xl font-bold text-ink">Subtotal</h5>
                <h5 className="font-heading text-xl font-bold text-ink">{kes(data?.subtotal ?? 0)}</h5>
              </div>
              <div className="flex gap-x-4">
                <Link href="/cart" onClick={close} className="flex h-12 flex-1 items-center justify-center rounded-[80px] border border-line text-base font-semibold text-ink transition hover:border-ink hover:bg-well">View Cart</Link>
                <Link href="/checkout" onClick={close} aria-disabled={!data?.items.length} className={`flex h-12 flex-1 items-center justify-center rounded-[80px] bg-brand-600 text-base font-semibold text-white shadow-[0_8px_16px_rgba(161,15,228,0.24)] transition hover:bg-brand-700 ${data?.items.length ? "" : "pointer-events-none opacity-50"}`}>Proceed to Checkout</Link>
              </div>
            </div>
          </div>
        </div>
      </SidePanel>
    </>
  );
}

function Skeletons() {
  return <>{[0, 1, 2].map((k) => <div key={k} className="h-[136px] animate-pulse rounded-2xl border border-line bg-well/60" />)}</>;
}
