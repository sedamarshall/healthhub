import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { HomeBlockEditor } from "../HomeBlockEditor";

export const metadata = { title: "Edit Block" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  const id = Number((await params).id);
  if (!id) notFound();
  return <HomeBlockEditor id={id} />;
}
