import { requireStaff } from "@/lib/auth";
import { BrandEditor } from "../BrandEditor";

export const metadata = { title: "Edit Brand" };

export default async function EditBrand({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  return <BrandEditor id={Number((await params).id)} />;
}
