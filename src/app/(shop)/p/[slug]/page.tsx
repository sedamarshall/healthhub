import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { cardInclude, visible } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { canPurchase, effectivePrice, kes, maxQty, saleActive } from "@/lib/utils";
import { STORE } from "@/lib/config";
import { ProductRail, SectionHead, Stars, discountPct } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Listing";
import { AddToCartButton } from "@/components/AddToCart";
import { Gallery } from "@/components/Gallery";
import { WishlistButton } from "@/components/Wishlist";
import { ShareButton } from "@/components/ShareButton";
import { ReviewForm } from "@/components/ReviewForm";
import { DetailTabs } from "@/components/DetailTabs";
import { RecentlyViewed, TrackView } from "@/components/RecentlyViewed";
import { RxIcon } from "@/components/Icons";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ rsort?: string }> };

async function load(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: { include: { parent: true } } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p || p.status !== "active") return {};
  return {
    // The old site's meta titles often don't match the product, so the product name is used.
    title: p.name,
    description: p.metaDescription ?? p.descriptionText.slice(0, 155),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { images: p.images[0] ? [p.images[0].url] : [] },
  };
}

const RIBBON_TAIL = "after:absolute after:left-full after:top-0 after:h-full after:w-1 after:[clip-path:polygon(0_0,100%_0,0_25%,100%_50%,0_75%,100%_100%,0_100%)]";

export default async function ProductPage({ params, searchParams }: Props) {
  const p = await load((await params).slug);
  if (!p || p.status !== "active") notFound();
  const { rsort } = await searchParams;
  const order = rsort === "highest" ? [{ rating: "desc" as const }, { createdAt: "desc" as const }] : rsort === "lowest" ? [{ rating: "asc" as const }, { createdAt: "desc" as const }] : [{ createdAt: "desc" as const }];

  const cats = p.categories.map((c) => c.category).filter((c) => c.isActive);
  const leaf = [...cats].sort((a, b) => (b.parentId ? 1 : 0) - (a.parentId ? 1 : 0))[0];
  const [session, s, reviews, dist, related] = await Promise.all([
    getSession(),
    getSettings(),
    prisma.review.findMany({ where: { productId: p.id, status: "published" }, orderBy: order, take: 30 }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: p.id, status: "published" }, _count: { _all: true } }),
    leaf
      ? prisma.product.findMany({
          where: { ...visible, id: { not: p.id }, stockStatus: { not: "out_of_stock" }, categories: { some: { categoryId: leaf.id } } },
          include: cardInclude,
          take: 12,
        })
      : Promise.resolve([]),
  ]);
  const me = session ? await prisma.user.findUnique({ where: { id: session.uid }, select: { name: true, email: true } }) : null;

  const available = canPurchase(p);
  const price = effectivePrice(p);
  const off = discountPct(p);
  const deliveryText = p.stockStatus === "special_order" ? "Ships in 2–3 days" : `Same day in Nairobi, 1–4 days countrywide. Free over ${kes(Number(s.freeDeliveryOver))}`;
  const stockText = p.stockStatus === "special_order" ? "Available to order" : available ? (p.stockQty <= 5 ? `Only ${p.stockQty} left` : "In stock") : "Out of stock";
  const countOf = (r: number) => dist.find((d) => d.rating === r)?._count._all ?? 0;
  const maxCount = Math.max(1, ...[1, 2, 3, 4, 5].map(countOf));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    image: p.images.map((i) => new URL(i.url, STORE.appUrl).toString()),
    description: p.descriptionText.slice(0, 500),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
    offers: { "@type": "Offer", priceCurrency: "KES", price, availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${STORE.appUrl}/p/${p.slug}` },
  };

  const additional: [string, React.ReactNode][] = [
    ["SKU", p.sku],
    ["Brand", p.brand ?? "-"],
    ["Category", cats.map((c) => c.name).join(", ") || "-"],
    ["Product type", p.rxClass === "pom" ? "Prescription-only medicine (pharmacist approval needed)" : "Over the counter"],
    ["Availability", stockText],
    ["Delivery", deliveryText],
    ["Payment", "M-Pesa, Visa, Mastercard"],
  ];

  return (
    <div className="container-x py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackView item={{ slug: p.slug, name: p.name, price: kes(price), image: p.images[0]?.url }} />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          ...(leaf?.parent ? [{ name: leaf.parent.name, href: `/c/${leaf.parent.slug}` }] : []),
          ...(leaf ? [{ name: leaf.name, href: `/c/${leaf.slug}` }] : []),
          { name: p.name },
        ]}
      />

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6 xl:col-span-7">
          <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt ?? p.name }))} name={p.name} />
        </div>

        <div className="mt-6 lg:col-span-6 lg:mt-0 xl:col-span-5">
          <div className="rounded-3xl border border-line p-6">
            {off > 0 && <span className={`relative mb-6 inline-block bg-sale px-1 text-sm font-medium uppercase leading-[22px] text-[#fff7cd] after:bg-sale ${RIBBON_TAIL}`}>Sales</span>}
            {leaf && <p className="mb-6 text-xs font-bold uppercase leading-[18px] text-[#1890ff]">{leaf.name}</p>}
            <div className="flex items-start justify-between gap-4">
              <h1 className="line-clamp-2 font-heading text-2xl font-bold leading-tight text-ink sm:text-[32px] sm:leading-[48px]" title={p.name}>{p.name}</h1>
              <WishlistButton item={{ id: p.id, slug: p.slug, name: p.name, price: kes(price), image: p.images[0]?.url }} className="mt-1 !bg-[#f9fafb] text-muted" />
            </div>
            <a href="#reviews" className="mt-4 flex items-center text-muted hover:text-brand-600">
              <Stars value={p.ratingAvg} />
              <span className="ml-1 inline-block">({p.ratingCount} review{p.ratingCount === 1 ? "" : "s"})</span>
            </a>

            <div className="mt-4 flex flex-wrap items-center gap-x-3">
              <span className={`relative text-2xl font-bold leading-9 text-ink ${off > 0 ? "pr-3 after:absolute after:right-0 after:top-1/2 after:h-6 after:w-px after:-translate-y-1/2 after:bg-line" : ""}`}>{kes(price)}</span>
              {off > 0 && <span className="text-2xl leading-9 text-faint line-through">{kes(p.price)}</span>}
              {off > 0 && <span className={`relative bg-accent px-1 text-sm font-medium uppercase leading-[22px] text-black after:bg-accent ${RIBBON_TAIL}`}>{off}% Off</span>}
            </div>
            {saleActive(p) && p.saleEndsAt && <p className="mt-2 text-sm text-sale">Offer ends {p.saleEndsAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>}
            <p className={`mt-2 text-[15px] font-medium ${available ? (p.stockStatus === "special_order" ? "text-[#b78103]" : "text-brand-600") : "text-sale"}`}>{stockText}</p>

            <div className="my-6 border-t border-line" />

            {p.rxClass === "pom" && (
              <div className="mb-6 flex gap-3 rounded-2xl bg-accent-soft p-4 text-sm text-ink">
                <RxIcon className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Prescription-only medicine</p>
                  <p className="mt-0.5 text-muted">Upload a valid prescription at checkout. Our pharmacist reviews it before your order is confirmed, and you pay only after approval.</p>
                </div>
              </div>
            )}

            <p className="mb-4 font-semibold text-ink">Quantity:</p>
            <AddToCartButton productId={p.id} disabled={!available} buyNow max={maxQty(p)} />

            <div className="my-6 border-t border-line" />
            <div className="flex items-center text-[#1890ff]">
              <ShareButton title={p.name} />
              <span className="mx-4 h-4 w-px bg-line" />
              <a href={`https://wa.me/${(s.whatsapp || s.phone).replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hi, I have a question about ${p.name} (${p.sku})`)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">Ask a pharmacist</a>
            </div>

            <dl className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-x-4">
                <dt className="font-semibold text-ink">Free Shipping:</dt>
                <dd className="text-muted">{deliveryText}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="font-semibold text-ink">SKU:</dt>
                <dd className="text-muted">{p.sku}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Categories:</dt>
                <dd className="mt-2 text-muted">
                  {cats.length ? cats.map((c, i) => <span key={c.id}>{i > 0 && ", "}<Link href={`/c/${c.slug}`} className="hover:text-brand-600">{c.name}</Link></span>) : "-"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>


      <div className="mt-12">
        <DetailTabs
          tabs={["Description", "Additional Info", "Reviews"]}
          panels={[
            <div key="d" className="prose-hh !text-muted" dangerouslySetInnerHTML={{ __html: p.descriptionHtml || "<p>No description yet.</p>" }} />,
            <table key="a" className="w-full border-collapse">
              <tbody>
                {additional.map(([k, v]) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <th className="w-[180px] py-3 text-left align-top font-semibold text-ink">{k}</th>
                    <td className="py-3 text-muted">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>,
            <div key="r" className="grid gap-8 xl:grid-cols-[380px_1fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-line p-6">
                  <p className="font-semibold text-ink">Average Rating</p>
                  <p className="mt-2 font-heading text-5xl font-bold text-ink">{p.ratingCount ? `${p.ratingAvg.toFixed(1)}/5` : "–/5"}</p>
                  <div className="mt-2 flex items-center gap-2"><Stars value={p.ratingAvg} /> <span className="text-sm text-muted">({p.ratingCount} reviews)</span></div>
                  <ul className="mt-5 space-y-2.5">
                    {[5, 4, 3, 2, 1].map((r) => (
                      <li key={r} className="flex items-center gap-3 text-sm">
                        <span className="w-12 shrink-0 text-ink">{r} Star</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-well"><span className="block h-full rounded-full bg-[#ffab00]" style={{ width: `${(countOf(r) / maxCount) * 100}%` }} /></span>
                        <span className="w-8 text-right text-muted">{countOf(r)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ReviewForm productId={p.id} name={me?.name} email={me?.email} />
              </div>
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-heading text-xl font-bold text-ink">Customer Ratings & Review</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted">Sorting</span>
                    {[["newest", "Newest"], ["highest", "Highest"], ["lowest", "Lowest"]].map(([k, l]) => (
                      <Link key={k} href={`/p/${p.slug}?rsort=${k}#reviews`} scroll={false} className={`rounded-full px-3 py-1.5 ${(rsort ?? "newest") === k ? "bg-[rgba(161,15,228,0.08)] font-medium text-brand-600" : "text-muted hover:text-ink"}`}>{l}</Link>
                    ))}
                  </div>
                </div>
                {reviews.length === 0 ? (
                  <p className="rounded-2xl border border-line p-6 text-muted">No reviews yet. Be the first to review this product.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-2xl border border-line">
                    {reviews.map((r) => (
                      <li key={r.id} className="p-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-heading text-lg font-bold text-brand-700">{r.name[0]?.toUpperCase()}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-ink">{r.name}</p>
                            <p className="text-xs text-muted">{r.createdAt.toLocaleDateString("en-KE", { dateStyle: "medium" })}</p>
                          </div>
                          <span className="flex items-center gap-1 text-sm font-semibold text-ink"><Stars value={r.rating} /> {r.rating.toFixed(1)}</span>
                        </div>
                        {r.verified && <p className="mt-3 text-xs font-semibold text-brand-600">✓ Verified purchase</p>}
                        <p className="mt-2 text-muted">{r.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>,
          ]}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <SectionHead title="Related Products" href={leaf ? `/c/${leaf.slug}` : undefined} arrowsFor="rail-related" />
          <ProductRail id="rail-related" products={related} />
        </section>
      )}
      <RecentlyViewed exclude={p.slug} />
    </div>
  );
}
