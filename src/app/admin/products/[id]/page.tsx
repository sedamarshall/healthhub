import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { kes, saleActive } from "@/lib/utils";
import { ModuleHeader, Section, Stars, fmtDate } from "../../ui/kit";
import { Badge } from "../../ui/widgets";
import { ICategory, ITag, IRx, IPackage } from "../../ui/icons";
import { statusBadge } from "../ProductTable";

export const metadata = { title: "Product Details" };

export default async function ProductDetails({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  await requireStaff(["admin"]);
  const id = Number((await params).id);
  const sp = await searchParams;
  const [p, movements, sold] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } }, categories: { include: { category: true } }, tags: { include: { tag: true } }, reviews: { orderBy: { createdAt: "desc" }, take: 5 }, flashSale: true },
    }),
    prisma.stockMovement.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.orderItem.aggregate({ where: { productId: id, order: { paymentStatus: "paid" } }, _sum: { qty: true } }),
  ]);
  if (!p) notFound();

  const info = (icon: React.ReactNode, bg: string, label: string, value: React.ReactNode) => (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>{icon}</span>
      <span>
        <span className="block text-xs text-[#919eab]">{label}</span>
        <span className="block text-sm font-medium text-[#212529]">{value}</span>
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <ModuleHeader title="Product Details" back="/admin/products">
        {p.status === "active" && <Link href={`/p/${p.slug}`} target="_blank" className="inline-flex h-9 items-center rounded-full px-4 text-sm font-bold shadow-[0_0_0_1px_rgba(145,158,171,0.32)] hover:bg-[#f9fafb]">View in shop</Link>}
        <Link href={`/admin/products/${p.id}/edit`} className="inline-flex h-9 items-center rounded-full px-4 text-sm font-bold shadow-[0_0_0_1px_rgba(145,158,171,0.32)] hover:bg-[#f9fafb]">Edit</Link>
      </ModuleHeader>
      {(sp.created || sp.saved) && <p className="rounded-xl bg-[rgba(0,171,85,0.12)] px-4 py-3 text-sm text-[#850cbd]">{sp.created ? "Product created." : "Changes saved."}</p>}
      {p.needsReview && p.reviewNote && <p className="rounded-xl bg-[rgba(255,193,7,0.16)] px-4 py-3 text-sm text-[#b78103]">Flagged for review: {p.reviewNote}</p>}

      <Section title="Basic Information">
        <div className="flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.images[0] && <img src={p.images[0].url} alt="" className="h-16 w-16 rounded-xl bg-[#f9fafb] object-contain" />}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-[#212529]">{p.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#495057]">
              <span>SKU {p.sku}</span>
              {p.legacyCode && <span>Old code {p.legacyCode}</span>}
              {p.brand && <span>Brand: {p.brand}</span>}
            </p>
          </div>
          {statusBadge(p.status)}
        </div>
        <div className="mt-5 rounded-2xl border border-[rgba(145,158,171,0.2)] p-4">
          <p className="text-sm font-semibold text-[#212529]">Description</p>
          <div className="prose-hh mt-2 max-h-60 overflow-y-auto text-sm !text-[#495057]" dangerouslySetInnerHTML={{ __html: p.descriptionHtml || "<p>No description yet.</p>" }} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {info(<IPackage className="h-5 w-5 text-[#850cbd]" />, "#efd6fc", "Price", <>{kes(p.price)}{p.salePrice && <span className="ml-1 text-[#cb0233]">→ {kes(p.salePrice)}{!saleActive(p) && " (not active)"}</span>}</>)}
          {info(<IPackage className="h-5 w-5 text-[#cb0233]" />, "#ffe4de", "Stock", `${p.stockQty} pcs · ${p.stockStatus.replace(/_/g, " ")} · ${sold._sum.qty ?? 0} sold`)}
          {info(<ICategory className="h-5 w-5 text-[#b78103]" />, "#fff5cc", "Categories", p.categories.map((c) => c.category.name).join(", ") || "-")}
          {info(<IRx className="h-5 w-5 text-[#5b44c9]" />, "#ece8ff", "Product type", p.rxClass === "pom" ? "Prescription-only" : "Over the counter")}
        </div>
      </Section>

      <Section title="Media">
        <div className="flex flex-wrap gap-4">
          {p.images.length === 0 && <p className="text-sm text-[#919eab]">No images.</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.images.map((i) => <img key={i.id} src={i.url} alt="" className="h-24 w-24 rounded-xl bg-[#f9fafb] object-contain" />)}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Tags & Discount">
          <div className="flex flex-wrap gap-2">
            {p.tags.length ? p.tags.map((t) => <Badge key={t.tagId} tone="info"><ITag className="mr-1 h-3 w-3" />{t.tag.name}</Badge>) : <span className="text-sm text-[#919eab]">No tags.</span>}
          </div>
          <p className="mt-4 text-sm text-[#495057]">
            {p.salePrice ? <>Discount price <b>{kes(p.salePrice)}</b>{p.saleStartsAt && <> from {fmtDate(p.saleStartsAt)}</>}{p.saleEndsAt && <> until {fmtDate(p.saleEndsAt)}</>}{p.flashSale && <> · Flash sale “{p.flashSale.title}”</>}</> : "No discount."}
          </p>
        </Section>
        <Section title={`Reviews (${p.ratingCount})`}>
          {p.reviews.length === 0 ? <p className="text-sm text-[#919eab]">No reviews yet.</p> : (
            <ul className="space-y-3">
              {p.reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center gap-2"><Stars value={r.rating} /> <b>{r.name}</b> <span className="text-xs text-[#919eab]">{fmtDate(r.createdAt)}</span></div>
                  <p className="mt-1 text-[#495057]">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Stock History">
        {movements.length === 0 ? <p className="text-sm text-[#919eab]">No stock changes recorded.</p> : (
          <ul className="divide-y divide-[rgba(145,158,171,0.2)] text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex justify-between py-2">
                <span className="text-[#495057]">{m.createdAt.toLocaleString("en-KE")} · {m.reason}{m.userEmail ? ` · ${m.userEmail}` : ""}{m.orderId ? ` · order ${m.orderId}` : ""}</span>
                <span className={m.delta > 0 ? "font-semibold text-[#a10fe4]" : "font-semibold text-[#cb0233]"}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
