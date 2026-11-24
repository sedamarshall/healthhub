import { requireStaff } from "@/lib/auth";
import { TagEditor } from "../TagEditor";

export const metadata = { title: "Edit Tag" };

export default async function EditTag({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  return <TagEditor id={Number((await params).id)} />;
}
