import { requireStaff } from "@/lib/auth";
import { UserEditor } from "../UserEditor";

export const metadata = { title: "Edit User" };

export default async function EditUser({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const me = await requireStaff(["admin"]);
  const sp = await searchParams;
  return <UserEditor id={Number((await params).id)} back={sp.back} me={me.uid} />;
}
