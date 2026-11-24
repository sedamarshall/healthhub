import { requireStaff } from "@/lib/auth";
import { PageEditor } from "../../PageEditor";

export const metadata = { title: "Create content" };

export default async function NewPage({ params }: { params: Promise<{ kind: string }> }) {
  await requireStaff(["admin"]);
  return <PageEditor kind={(await params).kind} />;
}
