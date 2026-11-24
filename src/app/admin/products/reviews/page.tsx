import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { deleteReview, setReviewStatus } from "../../actions-more";
import { Actions, Check, DataTable, IconAction, IconLink, ModuleHeader, Stars, ThumbCell, Toolbar, fmtDate, shortId } from "../../ui/kit";
import { AdminPagination, Badge } from "../../ui/widgets";

export const metadata = { title: "Product Review" };
const PER = 10;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const since = sp.date === "7" ? 7 : sp.date === "30" ? 30 : sp.date === "365" ? 365 : 0;
  const where: Prisma.ReviewWhereInput = {
    ...(sp.q ? { OR: [{ comment: { contains: sp.q } }, { name: { contains: sp.q } }, { product: { name: { contains: sp.q } } }] } : {}),
    ...(sp.rating ? { rating: Number(sp.rating) } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(since ? { createdAt: { gte: new Date(Date.now() - since * 86400000) } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } }),
  ]);

  return (
    <div>
      <ModuleHeader title="Product Review" />
      <Toolbar
        action="/admin/products/reviews"
        params={sp}
        filters={[
          { name: "status", label: "Status", options: [{ value: "pending", label: "Awaiting approval" }, { value: "published", label: "Published" }, { value: "hidden", label: "Hidden" }] },
          { name: "rating", label: "Rating", options: [5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} star${r > 1 ? "s" : ""}` })) },
          { name: "date", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "365", label: "Last 12 months" }] },
        ]}
      />
      <DataTable head={[<span key="c" className="sr-only">Select</span>, "ID", "Product", "User", "Review", "Rating", "Date", "Action"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="w-10"><Check label="Select review" /></td>
            <td className="!text-[#495057]">{shortId(r.id)}</td>
            <td><ThumbCell src={r.product.images[0]?.url} title={r.product.name} href={`/admin/products/${r.productId}`} /></td>
            <td className="whitespace-nowrap">{r.name}{r.email && <span className="block text-xs text-[#919eab]">{r.email}</span>}</td>
            <td className="max-w-[280px]">
              <span className="line-clamp-2">{r.comment}</span>
              {r.status === "hidden" && <Badge tone="neutral">Hidden</Badge>}
              {r.status === "pending" && <Badge tone="warning">Awaiting approval</Badge>}
              {r.verified && <Badge tone="success">Verified purchase</Badge>}
            </td>
            <td><Stars value={r.rating} /></td>
            <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
            <td>
              <Actions>
                <IconLink href={`/p/${r.product.slug}#reviews`} kind="view" label="View on shop" />
                <IconAction action={setReviewStatus} kind={r.status === "published" ? "ban" : "approve"} label={r.status === "published" ? "Hide review" : "Publish review"} fields={{ id: r.id, status: r.status === "published" ? "hidden" : "published" }} />
                <IconAction action={deleteReview} kind="delete" label="Delete review" fields={{ id: r.id }} confirm="Delete this review permanently?" />
              </Actions>
            </td>
          </tr>
        ))}
      </DataTable>
      <AdminPagination base="/admin/products/reviews" params={{ ...sp, page: undefined }} page={page} pages={Math.ceil(total / PER)} />
    </div>
  );
}
