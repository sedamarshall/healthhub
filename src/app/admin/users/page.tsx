import { requireStaff } from "@/lib/auth";
import { ExportLink, ModuleHeader, PrimaryLink } from "../ui/kit";
import { UserTable } from "./UserTable";

export const metadata = { title: "Users" };

/** Staff accounts that can sign in to this admin. Shoppers are in the separate Customers module. */
export default async function StaffUsers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaff(["admin"]);
  const sp = await searchParams;
  return (
    <div>
      <ModuleHeader title="Users">
        <ExportLink href="/admin/export/admins" tone="yellow" />
        <PrimaryLink href="/admin/users/new?role=pharmacist&back=/admin/users">Create User</PrimaryLink>
      </ModuleHeader>
      <p className="-mt-2 mb-5 text-sm text-[#637381]">Staff who can sign in to this admin: admins and pharmacists. Shoppers are under Customers.</p>
      <UserTable base="/admin/users" sp={sp} where={{ role: { in: ["admin", "pharmacist"] } }} me={me.uid} variant="admins" />
    </div>
  );
}
