"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clearSession, setSession } from "@/lib/auth";
import { normalizeKenyanPhone } from "@/lib/utils";
import { linkCartToUser } from "@/lib/cart";
import { allow, clientIp } from "@/lib/ratelimit";
import { notifyWelcome } from "@/lib/notify";

export type AuthState = { error?: string; email?: string; name?: string; phone?: string };

const safeNext = (n: FormDataEntryValue | null, fallback: string) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
};

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  if (!allow(`login:${ip}`, 20, 15 * 60_000) || !allow(`login:${email}`, 8, 15 * 60_000)) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes, or reset your password.", email };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Wrong email or password", email };
  if (!user.isActive) return { error: "This account has been deactivated. Please contact us.", email };
  // The staff sign-in page has a "Keep me signed in" box; other forms always remember.
  const remember = form.get("rememberField") ? form.get("remember") === "on" : true;
  await setSession({ uid: user.id, role: user.role as "customer", name: user.name, email: user.email }, { remember });
  await linkCartToUser(user.id);
  redirect(safeNext(form.get("next"), user.role === "customer" ? "/account" : "/admin"));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!allow(`register:${await clientIp()}`, 5, 60 * 60_000)) return { error: "Too many sign-ups from this connection. Please try again later." };
  const raw = Object.fromEntries(form.entries()) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: raw.email, name: raw.name, phone: raw.phone };
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid phone number, e.g. 0712 345 678", email: raw.email, name: raw.name, phone: raw.phone };
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) return { error: "An account with this email already exists. Sign in instead.", email: raw.email, name: raw.name, phone: raw.phone };
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, phone, passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });
  notifyWelcome(user);
  // Attach earlier guest orders placed with the same email
  await prisma.order.updateMany({ where: { email: user.email, userId: null }, data: { userId: user.id } });
  await linkCartToUser(user.id);
  await setSession({ uid: user.id, role: "customer", name: user.name, email: user.email });
  redirect(safeNext(form.get("next"), "/account"));
}

export async function logout() {
  await clearSession();
  redirect("/");
}
