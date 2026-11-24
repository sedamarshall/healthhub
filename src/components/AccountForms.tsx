"use client";

import { useActionState } from "react";
import { changePassword, saveAddress, updateProfile, type AccountState } from "@/app/actions/account";
import { Field, FieldSelect } from "./Field";

const COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Kajiado", "Uasin Gishu", "Kakamega", "Kilifi", "Kwale", "Meru", "Nyeri", "Murang'a", "Kirinyaga", "Embu", "Kericho", "Bomet", "Kisii", "Nyamira", "Migori", "Homa Bay", "Siaya", "Busia", "Bungoma", "Trans Nzoia", "Nandi", "Elgeyo-Marakwet", "Baringo", "Laikipia", "Nyandarua", "Narok", "Kitui", "Makueni", "Taita-Taveta", "Lamu", "Tana River", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Samburu", "Turkana", "West Pokot", "Tharaka-Nithi", "Vihiga"];

function Msg({ s }: { s: AccountState }) {
  if (s.error) return <p className="text-sm text-sale" role="alert">{s.error}</p>;
  if (s.ok) return <p className="text-sm text-brand-600" role="status">{s.ok}</p>;
  return null;
}
const btn = "h-12 rounded-full bg-brand-600 px-8 text-[15px] font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700 disabled:opacity-60";

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [s, action, pending] = useActionState<AccountState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" required defaultValue={name} autoComplete="name" />
        <Field label="Phone number" name="phone" type="tel" required defaultValue={phone} autoComplete="tel" />
        <Field label="Email address" name="email" type="email" required defaultValue={email} autoComplete="email" className="sm:col-span-2" />
      </div>
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save Changes"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" name="current" type="password" required autoComplete="current-password" />
        <Field label="New password" name="next" type="password" required minLength={8} autoComplete="new-password" />
        <Field label="Confirm new password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Saving…" : "Change Password"}</button>
    </form>
  );
}

export function AddressForm({ v, types }: { v: { county?: string | null; town?: string | null; area?: string | null; street?: string | null; apartment?: string | null; addressType?: string | null }; types: string[] }) {
  const [s, action, pending] = useActionState<AccountState, FormData>(saveAddress, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect label="County" name="county" defaultValue={v.county ?? "Nairobi"}>
          {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </FieldSelect>
        <Field label="Town / City" name="town" required defaultValue={v.town ?? ""} />
        <Field label="Area / Estate" name="area" defaultValue={v.area ?? ""} />
        <Field label="Street & building" name="street" required defaultValue={v.street ?? ""} />
        <Field label="Apartment, suite, landmark (optional)" name="apartment" defaultValue={v.apartment ?? ""} className="sm:col-span-2" />
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {types.map((t, i) => (
          <label key={t} className="flex cursor-pointer items-center gap-3 text-[15px]">
            <input type="radio" name="addressType" value={t} defaultChecked={v.addressType ? v.addressType === t : i === 0} className="h-5 w-5 accent-[#a10fe4]" />
            {t}
          </label>
        ))}
      </div>
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save Address"}</button>
    </form>
  );
}
