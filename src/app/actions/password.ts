"use server";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendAccountEmail } from "@/lib/mail";
import { STORE } from "@/lib/config";
import { allow, clientIp } from "@/lib/ratelimit";
import { hashPassword } from "@/lib/auth";
import { verifyTurnstile } from "@/lib/turnstile";

export type ResetState = { error?: string; ok?: string };
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Always answers the same way, so the form can't be used to discover which emails have accounts. */
export async function requestReset(_p: ResetState, f: FormData): Promise<ResetState> {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address" };
  const ip = await clientIp();
  if (!(await verifyTurnstile(f, ip))) return { error: "Please complete the security check and try again." };
  if (!(await allow(`reset:${ip}`, 5, 60 * 60_000))) return { error: "Too many requests. Please try again later." };
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const recent = await prisma.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } });
    if (recent < 3) {
      const token = randomBytes(32).toString("hex");
      await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
      const link = `${STORE.appUrl}/reset-password?token=${token}`;
      const r = await sendAccountEmail("password_reset", user.email, { name: user.name, link });
      if (!r.ok && process.env.NODE_ENV !== "production") console.log(`[dev] password reset link for ${user.email}: ${link}`);
    }
  }
  return { ok: "If an account exists for that email, we've sent a link to reset your password. Check your inbox (and spam folder)." };
}

export async function resetPassword(_p: ResetState, f: FormData): Promise<ResetState> {
  const token = String(f.get("token") ?? "");
  const pw = String(f.get("password") ?? "");
  const confirm = String(f.get("confirm") ?? "");
  if (pw.length < 8) return { error: "Password must be at least 8 characters" };
  if (pw !== confirm) return { error: "Passwords don't match" };
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: "This reset link is invalid or has expired. Please request a new one." };
  await prisma.$transaction([
    // New password + sign out every device (whoever had the old password loses access).
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(pw), sessionVersion: { increment: 1 } } }),
    prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: "Your password has been changed. You can now log in." };
}
