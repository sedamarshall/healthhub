import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { changeMyPassword, saveMyProfile } from "../actions-more";
import { FInput, ModuleHeader, Section, fmtDate } from "../ui/kit";
import { ActionForm, SaveButtons, UploadBox } from "../ui/kit-client";

export const metadata = { title: "Profile" };
const ROLE: Record<string, string> = { admin: "Master Admin", pharmacist: "Pharmacist" };

/** My Profile: every staff member can update their own details and password here. */
export default async function Profile() {
  const me = await requireStaff();
  const u = await prisma.user.findUnique({ where: { id: me.uid } });
  if (!u) return null;
  const initials = u.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="space-y-4 sm:space-y-6">
      <ModuleHeader title="Profile" back="/admin" />
      <Section>
        <div className="flex flex-wrap items-center gap-4">
          {u.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#efd6fc] text-xl font-bold text-[#850cbd]">{initials}</span>
          )}
          <div className="flex-1">
            <p className="text-lg font-bold text-[#212529]">{u.name}</p>
            <p className="text-sm text-[#637381]">{ROLE[u.role] ?? u.role} · {u.email} · joined {fmtDate(u.createdAt)}</p>
          </div>
        </div>
      </Section>
      <ActionForm action={saveMyProfile}>
        <Section title="Profile Picture">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_260px] sm:gap-6">
            <div className="text-sm text-[#495057]">
              <p>Shown next to your name at the top of the admin and in the staff list.</p>
              <p className="mt-1 text-xs text-[#919eab]">A square photo works best, at least 200 × 200 px. JPG, PNG or WEBP, under 2 MB.</p>
              {u.avatar && (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" name="removeAvatar" value="1" className="h-4 w-4 accent-[#a10fe4]" /> Remove my picture
                </label>
              )}
            </div>
            <UploadBox name="avatar" title={u.avatar ? "Change picture" : "Upload picture"} hint="JPG, PNG or WEBP · Max 2 MB" accept="image/jpeg,image/png,image/webp" />
          </div>
        </Section>
        <Section title="Basic Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <FInput label="Full Name" name="name" required defaultValue={u.name} />
            <FInput label="Email Address" name="email" type="email" required defaultValue={u.email} />
            <FInput label="Phone Number" name="phone" inputMode="tel" defaultValue={u.phone ? `0${u.phone.slice(3)}` : ""} />
            <FInput label="Role" name="roleLabel" value={ROLE[u.role] ?? u.role} readOnly disabled />
          </div>
        </Section>
        <SaveButtons saveLabel="Save Changes" />
      </ActionForm>
      <ActionForm action={changeMyPassword}>
        <Section title="Password">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <FInput label="Old Password" name="oldPassword" type="password" autoComplete="current-password" required />
            <FInput label="New Password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            <FInput label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </div>
        </Section>
        <SaveButtons saveLabel="Change Password" />
      </ActionForm>
    </div>
  );
}
