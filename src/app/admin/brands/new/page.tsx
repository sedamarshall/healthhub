import { requireStaff } from "@/lib/auth";
import { BrandEditor } from "../BrandEditor";

export const metadata = { title: "Create Brand" };

export default async function NewBrand() {
  await requireStaff(["admin"]);
  return <BrandEditor />;
}
