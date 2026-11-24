import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { ProductForm } from "../../ProductForm";
import { categoryTree } from "../../categoryTree";
import { ProductImages } from "../../ProductImages";

export const metadata = { title: "Edit Product" };

const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  const id = Number((await params).id);
  const [p, cats, brands, tags] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, categories: true, tags: { include: { tag: true } } } }),
    categoryTree(),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  if (!p) notFound();

  return (
    <div className="space-y-6">
      <ProductForm
        categories={cats.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
        brands={brands.map((b) => b.name)}
        tags={tags.map((t) => t.name)}
        values={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          brand: p.brand ?? "",
          price: p.price,
          salePrice: p.salePrice ?? "",
          saleStartsAt: local(p.saleStartsAt),
          saleEndsAt: local(p.saleEndsAt),
          stockQty: p.stockQty,
          stockStatus: p.stockStatus,
          rxClass: p.rxClass,
          status: p.status,
          featured: p.featured,
          needsReview: p.needsReview,
          descriptionHtml: p.descriptionHtml,
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
          categoryIds: p.categories.map((c) => c.categoryId),
          tags: p.tags.map((t) => t.tag.name).join(", "),
        }}
      />
      <ProductImages images={p.images} />
    </div>
  );
}
