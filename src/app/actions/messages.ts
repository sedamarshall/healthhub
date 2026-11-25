"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyContact } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { allow, clientIp } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getSession } from "@/lib/auth";

export type MsgState = { error?: string; ok?: string };

const schema = z.object({
  kind: z.enum(["contact", "feedback"]).default("contact"),
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(120).optional(),
  body: z.string().trim().min(5, "Write a message (at least 5 characters)").max(3000),
  orderId: z.coerce.number().int().optional(),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

/** Contact form + order feedback. Saved for Admin → Messages and copied to the store email. */
export async function sendMessage(_p: MsgState, f: FormData): Promise<MsgState> {
  const parsed = schema.safeParse(Object.fromEntries([...f.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ip = await clientIp();
  if (!(await verifyTurnstile(f, ip))) return { error: "Please complete the security check and try again." };
  const d = parsed.data;
  // Per connection and per recipient: the reply email goes to the address typed in, so cap that too.
  if (!(await allow(`msg:${ip}`, 5, 60 * 60_000)) || !(await allow(`msg:${d.email.toLowerCase()}`, 3, 60 * 60_000))) return { error: "Too many messages. Please try again later or call us." };
  // Feedback can only be attached to the sender's own order.
  let orderId: number | null = null;
  if (d.orderId) {
    const s = await getSession();
    const o = await prisma.order.findUnique({ where: { id: d.orderId }, select: { email: true, userId: true } });
    if (o && ((s && o.userId === s.uid) || o.email.toLowerCase() === d.email.toLowerCase())) orderId = d.orderId;
  }
  await prisma.message.create({ data: { kind: d.kind, name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, subject: d.subject || null, body: d.body, orderId } });
  const s = await getSettings();
  notifyContact({ name: d.name, email: d.email, phone: d.phone, subject: d.subject, body: d.body, storeEmail: s.email });
  return { ok: d.kind === "feedback" ? "Thanks for your feedback!" : "Thanks! We've received your message and will get back to you soon." };
}
