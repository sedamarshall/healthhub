import { requireStaff } from "@/lib/auth";
import { FlashEditor } from "../FlashEditor";

export const metadata = { title: "Create Flash Sale" };

export default async function Page() {
  await requireStaff(["admin"]);
  return <FlashEditor />;
}
