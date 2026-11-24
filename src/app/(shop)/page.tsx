import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { cardInclude, getNav, reviveProducts, TAGS, visible } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { kes } from "@/lib/utils";
import { HeroSlider, type Slide } from "@/components/HeroSlider";
import { getHomeBlocks } from "@/lib/home-blocks";
import { MiniProduct, ProductCard, ProductGrid, ProductRail, SectionHead } from "@/components/ProductCard";
import { RailArrows } from "@/components/RailArrows";
import { ProductTabs } from "@/components/ProductTabs";
import { WeekCountdown } from "@/components/Countdown";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { ArrowUpRight, HeadsetIcon, ShieldIcon, TruckIcon, WalletIcon } from "@/components/Icons";

const inStock = { ...visible, stockStatus: { not: "out_of_stock" }, images: { some: {} } };

/** Coloured band with the curved white title notch used throughout the reference design. */
function Band({ color, title, subtitle, children }: { color: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="container-x py-8">
      <div className={`relative rounded-[32px] px-3 pb-10 pt-32 sm:rounded-[40px] sm:px-6 ${color}`}>
        <div className="absolute left-1/2 top-0 w-[min(520px,88%)] -translate-x-1/2 rounded-b-[40px] bg-white px-6 pb-5 pt-2 text-center">
          <h2 className="section-title">{title}</h2>
          <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export default async function Home() {
  const [nav, settings] = await Promise.all([getNav(), getSettings()]);
  const FREE_DELIVERY_OVER = Number(settings.freeDeliveryOver);
  const bySlug = (s: string) => nav.find((c) => c.slug === s);
  const tabCats = ["multi-vitamins", "first-aid", "medical-diagnostic", "skin-care", "baby-and-mum"].map(bySlug).filter((c): c is NonNullable<typeof c> => !!c);

  // Home sections are cached (refreshed on admin changes, or every 5 minutes) so the page renders fast.
  const loadHome = unstable_cache(
    async () => {
    const [featured, sale, newest, popular, tiles, all] = await Promise.all([
      prisma.product.findMany({ where: { ...visible, featured: true }, include: cardInclude, take: 12 }),
      prisma.product.findMany({ where: { ...inStock, salePrice: { not: null } }, include: cardInclude, take: 8 }),
      prisma.product.findMany({ where: inStock, include: cardInclude, orderBy: [{ createdAt: "desc" }, { legacyId: "desc" }], take: 12 }),
      prisma.product.findMany({ where: { ...inStock, stockStatus: "in_stock" }, include: cardInclude, orderBy: { stockQty: "desc" }, skip: 12, take: 6 }),
      Promise.all(
        nav.slice(0, 12).map(async (c) => {
          const p = await prisma.product.findFirst({
            where: { ...inStock, categories: { some: { categoryId: c.id } } },
            orderBy: { stockQty: "desc" },
            include: { images: { take: 1, orderBy: { position: "asc" } } },
          });
          return { ...c, image: p?.images[0]?.url };
        }),
      ),
      prisma.product.findMany({ where: inStock, include: cardInclude, orderBy: { stockQty: "desc" }, take: 12 }),
  ]);
      return { featured, sale, newest, popular, tiles, all };
    },
    ["home"],
    { tags: [TAGS.catalog], revalidate: 300 },
  );
  const h = await loadHome();
  const featured = reviveProducts(h.featured), sale = reviveProducts(h.sale), newest = reviveProducts(h.newest), popular = reviveProducts(h.popular), all = reviveProducts(h.all);
  const tiles = h.tiles;

  const img = (s?: string) => (s ? featured.find((p) => p.categories[0]?.category.slug === s)?.images[0]?.url : undefined) ?? undefined;
  const blocks = await getHomeBlocks();
  const builtInSlides: Slide[] = [
    { tag: "Genuine medicines", badge: "Delivered", title: "Everything you need for wellness in one place.", text: "Over 4,000 medicines, vitamins, baby, skin and personal care products, delivered across Kenya.", href: "/search", cta: "Shop Now", image: featured[0]?.images[0]?.url, alt: featured[0]?.name ?? "" },
    { tag: "Vitamins & supplements", badge: "Top brands", title: "Boost your health with trusted supplements.", text: "Daily vitamins, immunity boosters and sports nutrition from brands you know.", href: "/c/multi-vitamins", cta: "Shop Vitamins", image: img("multi-vitamins") ?? featured[1]?.images[0]?.url, alt: "Vitamins" },
    { tag: "Skin & personal care", badge: "New in", title: "Top brands for skincare, haircare and more.", text: "La Roche-Posay, Cetaphil, Aveeno and more, at great prices.", href: "/c/skin-care", cta: "Shop Skin Care", image: img("skin-care") ?? featured[2]?.images[0]?.url, alt: "Skin care" },
    { tag: "Health devices", badge: "At home", title: "BP monitors, glucometers, thermometers & more.", text: "Check your health at home with reliable diagnostic devices.", href: "/c/medical-diagnostic", cta: "Shop Devices", image: img("medical-diagnostic") ?? featured[3]?.images[0]?.url, alt: "Medical devices" },
  ];
  // Admin → Home Page Control decides the slides; the built-in ones only show if none are active.
  const slides: Slide[] = blocks.hero.length
    ? blocks.hero.map((b) => ({ tag: b.tag, badge: b.badge, title: b.title, text: b.text, href: b.href, cta: b.ctaLabel || "Shop Now", image: b.image ?? undefined, alt: b.title }))
    : builtInSlides;

  const features = [
    { icon: <TruckIcon className="h-6 w-6" />, t: "Fast Delivery", d: `Same day in Nairobi. Free over ${kes(FREE_DELIVERY_OVER)}` },
    { icon: <HeadsetIcon className="h-6 w-6" />, t: "Pharmacist Support", d: "Licensed pharmacists ready to advise you" },
    { icon: <ShieldIcon className="h-6 w-6" />, t: "100% Genuine", d: "Sourced only from licensed suppliers" },
    { icon: <WalletIcon className="h-6 w-6" />, t: "Secure Payment", d: "M-Pesa, Airtel Money or card via iPay" },
  ];
  const deals = [...sale, ...featured.filter((f) => !sale.some((s) => s.id === f.id))].slice(0, 12);
  const builtInBanners = [
    { title: "Your Health, Our Priority", text: "Vitamins for the whole family", href: "/c/multi-vitamins", cta: "Shop Now", bg: "#ffe9d6", image: featured[4]?.images[0]?.url ?? null },
    { title: "Your Partner in Wellness", text: "Everything for mum & baby", href: "/c/baby-and-mum", cta: "Shop Now", bg: "#d9f3ee", image: featured[5]?.images[0]?.url ?? null },
    { title: "Health Made Simple", text: "First aid essentials, ready when needed", href: "/c/first-aid", cta: "Shop Now", bg: "#e6ecff", image: featured[6]?.images[0]?.url ?? null },
  ];
  const banners = blocks.promo.length
    ? blocks.promo.map((b) => ({ title: b.title, text: b.text, href: b.href, cta: b.ctaLabel || "Shop Now", bg: b.bgColor, image: b.image }))
    : builtInBanners;

  return (
    <>
      <section className="container-x pt-4 sm:pt-6"><HeroSlider slides={slides} /></section>

      <section className="container-x py-8">
        <SectionHead title="Daily Deals You'll Love" href="/search?sort=popular" />
        <ProductGrid products={deals} />
      </section>

      <Band color="bg-lime" title="Best Selling Products" subtitle="Our customers' favourites, in stock now">
        <ProductRail id="rail-best" products={featured} />
        <div className="mt-8 flex justify-center"><RailArrows target="rail-best" light /></div>
      </Band>

      <section className="container-x py-8">
        <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8">
          <div>
            <h2 className="section-title">Shop by Category</h2>
            <p className="mt-1.5 text-[15px] text-muted">Find what you need, fast</p>
          </div>
          <RailArrows target="rail-cats" />
        </div>
        <div id="rail-cats" className="scrollbar-none flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-6">
          {tiles.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="group w-[44%] shrink-0 snap-start sm:w-[23%] lg:w-[15.4%]">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
                {c.image && <Image src={c.image} alt="" fill sizes="220px" className="object-contain p-6 transition group-hover:scale-105" />}
              </div>
              <p className="mt-3 text-center text-[15px] font-medium text-ink group-hover:text-brand-600">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <Band color="bg-sun" title="Top Selling Products" subtitle="Popular picks across the store">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr_1.2fr]">
          <div className="flex flex-col justify-between rounded-3xl bg-white p-6">
            <div className="relative mx-auto aspect-square w-full max-w-[260px]">
              {popular[0]?.images[0] && <Image src={popular[0].images[0].url} alt={popular[0].name} fill sizes="260px" className="object-contain" />}
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-heading text-2xl font-bold">Stay Fit. Stay Healthy.</h3>
              <p className="mt-1 text-muted">Vitamins, supplements and sports nutrition.</p>
              <Link href="/c/multi-vitamins" className="mt-5 inline-flex items-center gap-3 rounded-full bg-brand-600 py-1.5 pl-5 pr-1.5 font-semibold text-white hover:bg-brand-700">
                Explore Wellness <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink"><ArrowUpRight className="h-4 w-4" /></span>
              </Link>
            </div>
          </div>
          {[["Popular Now", popular.slice(0, 3)], ["Just In", newest.slice(0, 3)]].map(([title, list]) => (
            <div key={title as string}>
              <h3 className="mb-4 font-heading text-2xl font-bold">{title as string}</h3>
              <div className="space-y-4">{(list as typeof popular).map((p) => <MiniProduct key={p.id} p={p} />)}</div>
            </div>
          ))}
        </div>
      </Band>

      <section className="container-x py-8">
        <ProductTabs tabs={[{ label: "All Products", slug: null }, ...tabCats.map((c) => ({ label: c.name, slug: c.slug }))]} first={<ProductGrid products={all} />} />
      </section>

      <section className="container-x grid gap-6 py-8 md:grid-cols-3">
        {banners.map((b) => (
          <Link key={b.title} href={b.href} className="tile-tint group relative flex min-h-[220px] items-center overflow-hidden rounded-3xl p-7" style={{ background: b.bg }}>
            <div className="relative z-10 max-w-[55%]">
              <h4 className="font-heading text-2xl font-bold leading-tight">{b.title}</h4>
              <p className="mt-2 text-muted">{b.text}</p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white group-hover:bg-brand-700">{b.cta}</span>
            </div>
            {b.image && (
              <div className="absolute bottom-4 right-4 top-4 w-[42%]">
                <Image src={b.image} alt="" fill sizes="200px" className="object-contain mix-blend-multiply" />
              </div>
            )}
          </Link>
        ))}
      </section>

      <section className="container-x py-8">
        <SectionHead title="Newly Launched Products" subtitle="Fresh arrivals in our catalogue" arrowsFor="rail-new" />
        <ProductRail id="rail-new" products={newest} />
      </section>

      {sale.length > 0 && (
        <section className="container-x py-8">
          <div className="grid gap-6 rounded-[32px] bg-brand-900 p-6 sm:p-10 lg:grid-cols-[360px_1fr]">
            <div className="text-white">
              <p className="font-heading text-lg font-bold text-accent">Limited Time Offer</p>
              <h2 className="mt-2 font-heading text-4xl font-bold">Hot Deals This Week</h2>
              <p className="mt-3 text-white/85">Discounts end Sunday at midnight. Grab them while stocks last.</p>
              <div className="mt-6"><WeekCountdown /></div>
            </div>
            {/* 2 per row up to xl (4 cards), 3 per row on xl (the 4th is hidden) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {sale.slice(0, 4).map((p, i) => <div key={p.id} className={i === 3 ? "xl:hidden" : ""}><ProductCard p={p} /></div>)}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed />

      {/* Store promises: the last section on the home page, just above the footer */}
      <section className="container-x grid grid-cols-2 gap-3 py-10 sm:py-12 sm:gap-6 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.t} className="rounded-2xl border border-line p-4 text-center sm:p-7">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">{f.icon}</span>
            <h3 className="mt-3 font-heading text-base font-bold sm:text-xl">{f.t}</h3>
            <p className="mt-1 text-sm text-muted sm:text-base">{f.d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
