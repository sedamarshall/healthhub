import { requireStaff } from "@/lib/auth";
import { HomeBlockEditor } from "../HomeBlockEditor";

export const metadata = { title: "Add New Block" };

export default async function Page() {
  await requireStaff(["admin"]);
  return <HomeBlockEditor />;
}
