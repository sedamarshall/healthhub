import { requireStaff } from "@/lib/auth";
import { UserEditor } from "../UserEditor";

export const metadata = { title: "Create User" };

export default async function NewUser({ searchParams }: { searchParams: Promise<{ role?: string; back?: string }> }) {
  const me = await requireStaff(["admin"]);
  const sp = await searchParams;
  return <UserEditor role={sp.role} back={sp.back} me={me.uid} />;
}
