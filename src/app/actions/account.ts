"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, setSession } from "@/lib/auth";
import { normalizeKenyanPhone } from "@/lib/utils";
import { ADDRESS_TYPES } from "@/lib/config";

export type AccountState = { error?: string; ok?: string };

export async function updateProfile(_p: AccountState, f: FormData): Promise<AccountState> {
  const s = await getSession();
  if (!s) return { error: "Please sign in again" };
  const parsed = z
    .object({ name: z.string().trim().min(2, "Enter your name").max(100), email: z.string().trim().toLowerCase().email("Enter a valid email"), phone: z.string().trim() })
    .safeParse(Object.fromEntries(f.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid phone number, e.g. 0712 345 678" };
  if (await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id: s.uid } } })) return { error: "Another account already uses that email" };
  const u = await prisma.user.update({ where: { id: s.uid }, data: { name: parsed.data.name, email: parsed.data.email, phone } });
  await setSession({ uid: u.id, role: u.role as "customer", name: u.name, email: u.email });
  revalidatePath("/account");
  return { ok: "Your details have been saved" };
}

export async function saveAddress(_p: AccountState, f: FormData): Promise<AccountState> {
  const s = await getSession();
  if (!s) return { error: "Please sign in again" };
  const g = (k: string) => String(f.get(k) ?? "").trim().slice(0, 200) || null;
  if (!g("town") || !g("street")) return { error: "Enter at least your town and street" };
  const addressType = g("addressType");
  await prisma.user.update({
    where: { id: s.uid },
    data: { county: g("county"), town: g("town"), area: g("area"), street: g("street"), apartment: g("apartment"), addressType: addressType && ADDRESS_TYPES.includes(addressType) ? addressType : null },
  });
  revalidatePath("/account");
  return { ok: "Address saved. We'll use it at checkout." };
}

export async function changePassword(_p: AccountState, f: FormData): Promise<AccountState> {
  const s = await getSession();
  if (!s) return { error: "Please sign in again" };
  const current = String(f.get("current") ?? "");
  const next = String(f.get("next") ?? "");
  const confirm = String(f.get("confirm") ?? "");
  const u = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!u || !(await bcrypt.compare(current, u.passwordHash))) return { error: "Your current password is wrong" };
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  if (next !== confirm) return { error: "New passwords don't match" };
  // Sign out every other device, then give this one a fresh session.
  await prisma.user.update({ where: { id: s.uid }, data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } } });
  await setSession(s);
  return { ok: "Password changed. Other devices have been signed out." };
}
