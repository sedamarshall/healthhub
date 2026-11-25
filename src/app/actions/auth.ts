"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkPassword, clearSession, hashPassword, needsRehash, setSession } from "@/lib/auth";
import { normalizeKenyanPhone } from "@/lib/utils";
import { linkCartToUser } from "@/lib/cart";
import { allow, clientIp, hitsFor, resetHits } from "@/lib/ratelimit";
import { turnstileOn, verifyTurnstile } from "@/lib/turnstile";
import { offerToLinkGuestOrders } from "@/lib/link-orders";
import { notifyWelcome } from "@/lib/notify";

/** captcha: the form should show the Turnstile check (after several failed sign-ins). */
export type AuthState = { error?: string; email?: string; name?: string; phone?: string; captcha?: boolean };

/**
 * Where to go after signing in: only paths on this site. Rejects "//evil.com" and "/\evil.com" (browsers
 * treat a backslash like a slash, so that also means another site), plus any backslash, space or control character.
 */
const safeNext = (n: FormDataEntryValue | null, fallback: string) => {
  const s = typeof n === "string" ? n : "";
  const bad = !s.startsWith("/") || s.startsWith("//") || s.includes("\\") || [...s].some((c) => c.charCodeAt(0) <= 32);
  return bad ? fallback : s;
};

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  const WINDOW = 15 * 60_000;
  if (!(await allow(`login:${ip}`, 20, WINDOW))) return { error: "Too many sign-in attempts from this connection. Please wait 15 minutes.", email };

  // After 5 wrong passwords for an email, ask for the Turnstile check instead of locking the account
  // (a hard lock would let anyone lock the real owner out). Without Turnstile keys, fall back to a
  // per-email-and-connection limit, which an attacker can't use to lock out someone on another connection.
  const fails = await hitsFor(`loginfail:${email}`, WINDOW);
  if (fails >= 5) {
    if (turnstileOn()) {
      if (!(await verifyTurnstile(form, ip))) return { error: "Please complete the security check and try again.", email, captcha: true };
    } else if (!(await allow(`login:${email}:${ip}`, 5, WINDOW))) {
      return { error: "Too many wrong passwords. Please wait 15 minutes, or reset your password.", email };
    }
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!(await checkPassword(password, user?.passwordHash)) || !user) {
    await allow(`loginfail:${email}`, 1_000, WINDOW);
    return { error: "Wrong email or password", email, captcha: turnstileOn() && fails + 1 >= 5 };
  }
  if (!user.isActive) return { error: "This account has been deactivated. Please contact us.", email };
  await resetHits(`loginfail:${email}`);
  // Older accounts were hashed with a lower cost: upgrade quietly now that we have the password.
  if (needsRehash(user.passwordHash)) await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
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
  const ip = await clientIp();
  const raw = Object.fromEntries(form.entries()) as Record<string, string>;
  if (!(await verifyTurnstile(form, ip))) return { error: "Please complete the security check and try again.", email: raw.email, name: raw.name, phone: raw.phone };
  if (!(await allow(`register:${ip}`, 5, 60 * 60_000))) return { error: "Too many sign-ups from this connection. Please try again later." };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: raw.email, name: raw.name, phone: raw.phone };
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid phone number, e.g. 0712 345 678", email: raw.email, name: raw.name, phone: raw.phone };
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) return { error: "An account with this email already exists. Sign in instead.", email: raw.email, name: raw.name, phone: raw.phone };
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, phone, passwordHash: await hashPassword(parsed.data.password) },
  });
  notifyWelcome(user);
  // Earlier guest orders with this email are only added after the owner confirms the email (link sent by email).
  offerToLinkGuestOrders(user);
  await linkCartToUser(user.id);
  await setSession({ uid: user.id, role: "customer", name: user.name, email: user.email });
  redirect(safeNext(form.get("next"), "/account"));
}

export async function logout() {
  await clearSession();
  redirect("/");
}
