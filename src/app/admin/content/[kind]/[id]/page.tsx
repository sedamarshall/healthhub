import { requireStaff } from "@/lib/auth";
import { PageEditor } from "../../PageEditor";

export const metadata = { title: "Edit content" };

export default async function EditPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requireStaff(["admin"]);
  const p = await params;
  return <PageEditor kind={p.kind} id={Number(p.id)} />;
}
