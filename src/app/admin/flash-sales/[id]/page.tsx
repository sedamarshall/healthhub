import { requireStaff } from "@/lib/auth";
import { FlashEditor } from "../FlashEditor";

export const metadata = { title: "Edit Flash Sale" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  return <FlashEditor id={Number((await params).id)} />;
}
