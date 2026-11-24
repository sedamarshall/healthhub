import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCart, getCartCoupon } from "@/lib/cart";
import { evaluateCoupon } from "@/lib/coupons";
import { getSettings } from "@/lib/settings";
import { canPurchase, kes, maxQty, saleActive } from "@/lib/utils";
import { Breadcrumbs } from "@/components/Listing";
import { Stars } from "@/components/ProductCard";
import { WishlistButton } from "@/components/Wishlist";
import { CartQty, CouponForm, ProceedToCheckout, RemoveAll, RemoveItem } from "@/components/CartLine";
import { TruckIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Shopping Cart", robots: { index: false } };

export default async function CartPage() {
  const [cart, code, s] = await Promise.all([getCart(), getCartCoupon(), getSettings()]);
  const coupon = code && cart.items.length ? await evaluateCoupon(code, cart.subtotal) : null;
  const discount = coupon?.ok ? coupon.discount : 0;
  const freeOver = Number(s.freeDeliveryOver);
  const unavailable = cart.items.filter((i) => !canPurchase(i.product));

  if (!cart.items.length) {
    return (
      <div className="container-x py-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Cart" }]} />
        <div className="rounded-2xl border border-line px-6 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted">Browse our catalogue and add something you need.</p>
          <Link href="/search" className="btn-primary mt-6 h-12 px-8">Start shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Cart" }]} />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-x-2">
          <h1 className="font-heading text-xl font-bold leading-[30px] text-ink">Cart</h1>
          <p className="text-base text-muted">({cart.count} item{cart.count === 1 ? "" : "s"})</p>
        </div>
        <RemoveAll />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
            <table className="w-full min-w-[760px] text-left text-base">
              <thead className="bg-well">
                <tr className="h-11">
                  <th className="pl-4 font-semibold text-ink">Product</th>
                  <th className="px-4 font-semibold text-ink">Price</th>
                  <th className="px-4 font-semibold text-ink">Quantity</th>
                  <th className="px-4 font-semibold text-ink">Total Price</th>
                  <th className="px-4 font-semibold text-ink">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-x-4">
                        <Link href={`/p/${i.product.slug}`} className="relative size-[120px] shrink-0 overflow-hidden rounded-2xl bg-[#f4f3f5]">
                          {i.product.images[0] && <Image src={i.product.images[0].url} alt={i.product.name} fill sizes="120px" className="object-contain p-3 mix-blend-multiply" />}
                        </Link>
                        <div className="flex min-w-0 max-w-[260px] flex-col gap-y-1">
                          <Link href={`/p/${i.product.slug}`} className="truncate font-semibold text-ink hover:text-brand-600" title={i.product.name}>{i.product.name}</Link>
                          {i.product.rxClass === "pom" && <p className="text-sm text-muted">Prescription required</p>}
                          <p className="text-sm text-muted">{i.product.stockStatus === "special_order" ? "Ships in 2–3 days" : `Available: ${i.product.stockQty}`}</p>
                          <div className="flex items-center gap-1 text-sm text-muted"><Stars value={i.product.ratingAvg} /> ({i.product.ratingCount})</div>
                          {!canPurchase(i.product) && <p className="text-sm font-semibold text-sale">No longer available, please remove</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-4">
                      <p className="font-semibold text-ink">{kes(i.unitPrice)}</p>
                      {saleActive(i.product) && <p className="text-faint line-through">{kes(i.product.price)}</p>}
                    </td>
                    <td className="p-4"><CartQty itemId={i.id} qty={i.qty} max={maxQty(i.product)} /></td>
                    <td className="whitespace-nowrap p-4 font-semibold text-ink">{kes(i.lineTotal)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-x-3">
                        <WishlistButton item={{ id: i.product.id, slug: i.product.slug, name: i.product.name, price: kes(i.unitPrice), image: i.product.images[0]?.url }} className="!h-auto !w-auto !border-0" />
                        <RemoveItem itemId={i.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: one card per item with label rows */}
          <div className="space-y-4 md:hidden">
            {cart.items.map((i) => (
              <div key={i.id} className="divide-y divide-line rounded-2xl border border-line text-[15px]">
                <div className="flex justify-between gap-4 p-4">
                  <span className="self-center text-muted">Product :</span>
                  <div className="flex flex-col items-end text-right">
                    <Link href={`/p/${i.product.slug}`} className="relative h-28 w-28 overflow-hidden rounded-xl bg-well">
                      {i.product.images[0] && <Image src={i.product.images[0].url} alt={i.product.name} fill sizes="112px" className="object-contain p-2 mix-blend-multiply" />}
                    </Link>
                    <Link href={`/p/${i.product.slug}`} className="mt-3 font-heading font-semibold">{i.product.name}</Link>
                    <p className="mt-1 text-sm text-muted">{i.product.stockStatus === "special_order" ? "Ships in 2–3 days" : `Available: ${i.product.stockQty}`}</p>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted"><Stars value={i.product.ratingAvg} /> ({i.product.ratingCount})</div>
                    {!canPurchase(i.product) && <p className="mt-1 text-sm font-semibold text-sale">No longer available</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted">Price :</span>
                  <span><b>{kes(i.unitPrice)}</b>{saleActive(i.product) && <span className="ml-2 text-faint line-through">{kes(i.product.price)}</span>}</span>
                </div>
                <div className="flex items-center justify-between p-4"><span className="text-muted">Quantity :</span><CartQty itemId={i.id} qty={i.qty} max={maxQty(i.product)} /></div>
                <div className="flex items-center justify-between p-4"><span className="text-muted">Total Price :</span><b>{kes(i.lineTotal)}</b></div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-muted">Action :</span>
                  <span className="flex items-center gap-3">
                    <WishlistButton item={{ id: i.product.id, slug: i.product.slug, name: i.product.name, price: kes(i.unitPrice), image: i.product.images[0]?.url }} className="!h-auto !w-auto !border-0" />
                    <RemoveItem itemId={i.id} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="col-span-12 h-fit xl:col-span-4 xl:sticky xl:top-5">
          <div className="flex flex-col gap-y-6 rounded-2xl border border-line p-4 md:p-6">
            <div className="inline-flex w-full items-center gap-x-2 rounded-[100px] bg-[rgba(161,15,228,0.08)] p-4 text-sm font-bold text-ink">
              <TruckIcon className="h-6 w-6 shrink-0 text-brand-600" />
              {cart.subtotal >= freeOver ? (
                <span>You&apos;ve unlocked <span className="text-base font-semibold text-brand-600">Free Delivery</span></span>
              ) : (
                <span>Spend {kes(freeOver - cart.subtotal)} more for <span className="text-base font-semibold text-brand-600">Free Delivery</span></span>
              )}
            </div>

            <div className="flex flex-col gap-y-6 rounded-2xl border border-line p-4 md:p-6">
              <h5 className="font-heading text-xl font-bold leading-[30px] text-ink">Order Summary</h5>
              <div>
                <CouponForm applied={coupon?.ok ? coupon.code : undefined} />
                {coupon && !coupon.ok && <p className="mt-2 text-sm text-sale">{coupon.message}</p>}
              </div>
              <div>
                <div className="flex flex-col gap-y-6 border-b border-line pb-4 text-base">
                  <div className="flex justify-between"><span className="text-muted">Sub-Total</span><span className="font-semibold text-ink">{kes(cart.subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between"><span className="text-muted">Discount ({coupon?.ok && coupon.code})</span><span className="font-semibold text-sale">−{kes(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted">Delivery</span><span className="text-muted">Calculated at checkout</span></div>
                </div>
                <div className="flex justify-between pt-4">
                  <h6 className="text-lg font-bold text-ink">Total</h6>
                  <h6 className="text-lg font-bold text-ink">{kes(cart.subtotal - discount)}</h6>
                </div>
              </div>
            </div>

            {cart.hasRx && <p className="rounded-xl bg-accent-soft p-3 text-sm">Your cart has prescription-only medicine. You&apos;ll upload your prescription at checkout and pay once our pharmacist approves it.</p>}
            {unavailable.length > 0 && <p className="text-sm text-sale">Remove unavailable items to continue.</p>}
            <ProceedToCheckout disabled={unavailable.length > 0} />
          </div>
        </aside>
      </div>
    </div>
  );
}
