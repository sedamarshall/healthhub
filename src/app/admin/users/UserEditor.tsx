import { prisma } from "@/lib/db";
import { saveUser } from "../actions-more";
import { ACTIVE_OPTIONS, FInput, FSelect, ModuleHeader, Section, StatusPill } from "../ui/kit";
import { ActionForm, SaveButtons } from "../ui/kit-client";

export async function UserEditor({ id, role = "customer", back = "/admin/users", me }: { id?: number; role?: string; back?: string; me: number }) {
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  const safeBack = back.startsWith("/admin") ? back : "/admin/users";
  const self = user?.id === me;
  return (
    <ActionForm action={saveUser}>
      {user && <input type="hidden" name="id" value={user.id} />}
      <input type="hidden" name="back" value={safeBack} />
      <ModuleHeader title={user ? (user.role === "customer" ? "Edit Customer" : "Edit User") : role === "customer" ? "Create New Customer" : "Create New User"} back={safeBack}>
        <StatusPill name="isActive" defaultValue={user && !user.isActive ? "off" : "on"} options={ACTIVE_OPTIONS} disabled={self} />
        {self && <input type="hidden" name="isActive" value="on" />}
      </ModuleHeader>
      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Full name" name="name" required defaultValue={user?.name} />
          <FInput label="Email Address" name="email" type="email" required defaultValue={user?.email} />
          <FInput label="Phone number" name="phone" inputMode="tel" defaultValue={user?.phone ? `0${user.phone.slice(3)}` : ""} />
          <FSelect label="Role" name="role" defaultValue={user?.role ?? role} disabled={self}>
            <option value="customer">Customer</option>
            <option value="pharmacist">Pharmacist (orders & prescriptions)</option>
            <option value="admin">Admin (full access)</option>
          </FSelect>
          {self && <input type="hidden" name="role" value={user!.role} />}
          <FInput label={user ? "New password (leave empty to keep)" : "Password (8+ characters)"} name="password" type="password" autoComplete="new-password" minLength={user ? undefined : 8} required={!user} />
        </div>
      </Section>
      <SaveButtons cancel={safeBack} saveLabel="Save Changes" />
    </ActionForm>
  );
}
