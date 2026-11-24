import { requireStaff } from "@/lib/auth";
import { ModuleHeader, PrimaryLink } from "../../ui/kit";
import { ProductTable, productWhere } from "../ProductTable";

export const metadata = { title: "Draft Products" };

export default async function DraftProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff(["admin"]);
  const sp = await searchParams;
  return (
    <div>
      <ModuleHeader title="Draft Products">
        <PrimaryLink href="/admin/products/new">Create Product</PrimaryLink>
      </ModuleHeader>
      <ProductTable base="/admin/products/drafts" sp={sp} where={productWhere({ ...sp, status: undefined }, { status: "draft" })} statusFilter={false} />
    </div>
  );
}
