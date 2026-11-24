import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { ProductForm } from "../ProductForm";
import { categoryTree } from "../categoryTree";

export const metadata = { title: "Create Product" };

export default async function NewProduct() {
  await requireStaff(["admin"]);
  const [cats, brands, tags] = await Promise.all([
    categoryTree(),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  return (
    <ProductForm
      categories={cats.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
      brands={brands.map((b) => b.name)}
      tags={tags.map((t) => t.name)}
      values={{
        name: "", slug: "", sku: "", brand: "", price: "", salePrice: "", saleStartsAt: "", saleEndsAt: "", stockQty: 0, stockStatus: "in_stock", rxClass: "otc",
        status: "active", featured: false, needsReview: false, descriptionHtml: "", metaTitle: "", metaDescription: "", categoryIds: [], tags: "",
      }}
    />
  );
}
