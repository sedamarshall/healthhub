import { requireStaff } from "@/lib/auth";
import { ExportLink, ModuleHeader, PrimaryLink } from "../ui/kit";
import { ProductTable, productWhere } from "./ProductTable";

export const metadata = { title: "Products" };

export default async function ProductList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  return (
    <div>
      <ModuleHeader title={sp.review ? "Products to Review" : "Product List"}>
        <ExportLink href="/admin/export/products" />
        <PrimaryLink href="/admin/products/new">Create Product</PrimaryLink>
      </ModuleHeader>
      <ProductTable base="/admin/products" sp={sp} where={productWhere(sp)} />
    </div>
  );
}
