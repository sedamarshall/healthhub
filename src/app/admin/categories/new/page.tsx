import { requireStaff } from "@/lib/auth";
import { CategoryEditor } from "../CategoryEditor";

export const metadata = { title: "Create Category" };

export default async function NewCategory() {
  await requireStaff(["admin"]);
  return <CategoryEditor />;
}
