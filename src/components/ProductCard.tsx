import Link from "next/link";
import Image from "next/image";
import type { CardProduct } from "@/lib/catalog";
import { canPurchase, effectivePrice, kes } from "@/lib/utils";
import { AddToCartButton } from "./AddToCart";
import { WishlistButton } from "./Wishlist";
import { RailArrows } from "./RailArrows";
import { ViewHi } from "./Hi";
import { ChevronLeft, ChevronRight } from "./Icons";

export { ChevronLeft, ChevronRight };

export function Stars({ value, size = 16 }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const mask = { WebkitMaskSize: `${size}px ${size}px`, maskSize: `${size}px ${size}px` };
  return (
    <span className="stars hi-star-mask shrink-0" style={{ width: size * 5, height: size, ...mask }} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span className="hi-star-mask" style={{ width: `${pct}%`, ...mask }} />
    </span>
  );
}

/** Stars + "(count)" exactly like the reference rating row. */
export function RatingRow({ avg, count, className = "mb-4" }: { avg: number; count: number; className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Stars value={avg} />
      <span className="ml-1 inline-block text-sm leading-[22px] text-muted">({count})</span>
    </div>
  );
}

export function ProductImage({ src, alt, sizes, priority, pad = "p-4" }: { src?: string; alt: string; sizes: string; priority?: boolean; pad?: string }) {
  if (!src) return <div className="absolute inset-0 flex items-center justify-center text-xs text-faint">No image</div>;
  // Product photos have white backgrounds; multiply blends them into the grey well.
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain mix-blend-multiply ${pad}`} />;
}

type PriceProps = { price: number; salePrice: number | null; saleStartsAt?: Date | null; saleEndsAt?: Date | null };

export function discountPct(p: PriceProps) {
  const now = effectivePrice(p);
  return now < p.price ? Math.round(((p.price - now) / p.price) * 100) : 0;
}

export function Price({ className = "", big = false, ...p }: PriceProps & { className?: string; big?: boolean }) {
  const now = effectivePrice(p);
  const off = discountPct(p);
  if (big) {
    return (
      <div className={`flex flex-wrap items-center gap-x-3 ${className}`}>
        <span className="text-[28px] font-semibold text-ink">{kes(now)}</span>
        {off > 0 && <span className="text-lg text-faint line-through">{kes(p.price)}</span>}
        {off > 0 && <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-ink">{off}% OFF</span>}
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-x-2 sm:gap-x-3 ${className}`}>
      <span className="text-[15px] font-semibold text-ink sm:text-base">{kes(now)}</span>
      {off > 0 && <span className="text-xs leading-[22px] text-faint line-through sm:text-sm">{kes(p.price)}</span>}
      {off > 0 && <span className="text-xs font-semibold leading-[22px] text-sale sm:text-sm">{off}% OFF</span>}
    </div>
  );
}

/** Red "15% OFF" ribbon with a notched tail, pinned to the image's left edge. */
export function DiscountBadge({ pct }: { pct: number }) {
  return (
    <span className="absolute left-0 top-[11px] z-20 bg-sale px-1 text-sm leading-[22px] text-[#fff7cd] after:absolute after:left-full after:top-0 after:h-full after:w-1 after:bg-sale after:[clip-path:polygon(0_0,100%_0,0_25%,100%_50%,0_75%,100%_100%,0_100%)]">
      {pct}% OFF
    </span>
  );
}

/** Product card ("product-card-1" in the reference storefront). */
export function ProductCard({ p, priority }: { p: CardProduct; priority?: boolean }) {
  const available = canPurchase(p);
  const off = discountPct(p);
  const wish = { id: p.id, slug: p.slug, name: p.name, price: kes(effectivePrice(p)), image: p.images[0]?.url };
  return (
    <div data-reveal className="@container group flex h-full flex-col rounded-2xl border border-line bg-white p-2.5 sm:p-4">
      <div className="relative">
        <div className="relative mb-3 w-full overflow-hidden rounded-xl bg-[#f4f3f5] pt-[100%] sm:mb-4">
          <Link href={`/p/${p.slug}`} className="absolute inset-0 z-[1] bg-[#f4f3f5] transition-transform duration-300 ease-in-out group-hover:-rotate-3 group-hover:scale-110" aria-label={p.name}>
            <ProductImage src={p.images[0]?.url} alt={p.name} sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 260px" priority={priority} />
          </Link>
          {p.rxClass === "pom" && <span className="absolute bottom-2 left-2 z-20 rounded bg-white px-1.5 text-xs font-semibold leading-[22px] text-ink">Rx</span>}
          {/* Phones have no hover, so the wishlist heart sits on the image instead of in the bottom row */}
          <WishlistButton item={wish} iconSize={18} className="absolute right-1.5 top-1.5 z-20 !h-8 !w-8 !border-0 !bg-white/90 text-muted shadow-sm sm:!hidden" />
        </div>
        {off > 0 && <DiscountBadge pct={off} />}
        {/* Hover actions (wishlist + quick view) slide up over the image */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[9] hidden justify-center opacity-0 sm:flex transition-all duration-300 ease-in-out group-hover:pointer-events-auto group-hover:bottom-7 group-hover:opacity-100">
          <ul className="flex items-center gap-x-px">
            <li><WishlistButton item={wish} iconSize={24} className="!h-11 !w-11 !rounded-none !rounded-l-sm !border-0 !bg-white text-muted hover:text-brand-600" /></li>
            <li>
              <Link href={`/p/${p.slug}`} aria-label="Quick view" title="Quick view" className="flex h-11 w-11 items-center justify-center rounded-r-sm bg-white text-ink hover:text-brand-600">
                <ViewHi size={24} />
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <h5 className="mb-2 text-sm font-semibold leading-5 text-ink sm:mb-4 sm:text-base sm:leading-6">
        <Link href={`/p/${p.slug}`} className="line-clamp-2 min-h-10 hover:text-brand-600 sm:min-h-12">{p.name}</Link>
      </h5>
      <RatingRow avg={p.ratingAvg} count={p.ratingCount} className="mb-2 sm:mb-4" />
      <Price price={p.price} salePrice={p.salePrice} saleStartsAt={p.saleStartsAt} saleEndsAt={p.saleEndsAt} className="mb-2" />
      {p.stockStatus === "special_order" && <p className="-mt-1 mb-2 text-xs text-[#b78103]">Ships in 2–3 days</p>}
      <div className="mt-auto flex items-center gap-x-4">
        <WishlistButton item={wish} className="!hidden !h-11 !w-11 flex-none !border-line !bg-[#f9fafb] text-muted hover:!bg-[#f4f6f8] sm:!flex" />
        <AddToCartButton productId={p.id} disabled={!available} className="min-w-0 flex-1" compactMobile />
      </div>
    </div>
  );
}

/** Grid: 2 per row on phones and tablets, 3 on laptops, 6 on wide screens (12px gaps on phones, 24px from sm). */
export function ProductGrid({ products, cols = "md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" }: { products: CardProduct[]; cols?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-6 ${cols}`}>
      {products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 3} />)}
    </div>
  );
}

/** Compact horizontal card used in "Popular / Just In" lists. */
export function MiniProduct({ p }: { p: CardProduct }) {
  return (
    <div data-reveal className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
      <Link href={`/p/${p.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f4f3f5]">
        <ProductImage src={p.images[0]?.url} alt={p.name} sizes="80px" pad="p-2" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/p/${p.slug}`} className="line-clamp-2 text-sm font-semibold leading-5 hover:text-brand-600">{p.name}</Link>
        <RatingRow avg={p.ratingAvg} count={p.ratingCount} className="mt-1" />
        <div className="mt-1 flex items-center justify-between gap-2">
          <Price price={p.price} salePrice={p.salePrice} saleStartsAt={p.saleStartsAt} saleEndsAt={p.saleEndsAt} />
          <AddToCartButton productId={p.id} disabled={!canPurchase(p)} label="Add" compact />
        </div>
      </div>
    </div>
  );
}

/** Section heading with optional subtitle and "view all"/arrows. */
export function SectionHead({ title, subtitle, href, arrowsFor }: { title: string; subtitle?: string; href?: string; arrowsFor?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {href && <Link href={href} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand-600 hover:text-brand-600">View all</Link>}
        {arrowsFor && <RailArrows target={arrowsFor} />}
      </div>
    </div>
  );
}

/** Horizontal slider of cards (2 / 2 / 3 / 4 per view; 12px gaps on phones, 24px from sm). */
export function ProductRail({ id, products, basis = "basis-[calc((100%-12px)/2)] sm:basis-[calc((100%-24px)/2)] lg:basis-[calc((100%-48px)/3)] xl:basis-[calc((100%-72px)/4)]" }: { id: string; products: CardProduct[]; basis?: string }) {
  if (!products.length) return null;
  return (
    <div id={id} className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-6">
      {products.map((p) => (
        <div key={p.id} className={`shrink-0 snap-start ${basis}`}>
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}
