import { requireStaff } from "@/lib/auth";
import { CategoryEditor } from "../CategoryEditor";

export const metadata = { title: "Edit Category" };

export default async function EditCategory({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  return <CategoryEditor id={Number((await params).id)} />;
}
