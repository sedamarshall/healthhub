import { requireStaff } from "@/lib/auth";
import { TagEditor } from "../TagEditor";

export const metadata = { title: "Create Tag" };

export default async function NewTag() {
  await requireStaff(["admin"]);
  return <TagEditor />;
}
