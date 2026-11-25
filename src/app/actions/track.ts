"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeKenyanPhone } from "@/lib/utils";
import { allow, clientIp } from "@/lib/ratelimit";

export type TrackState = { error?: string; number?: string; phone?: string };

/** Order tracking: order number + the phone used at checkout opens the order page. */
export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const rawNumber = String(form.get("number") ?? "");
  const rawPhone = String(form.get("phone") ?? "");
  // Accept "hh2611241234", "#HH2611241234", "HH 2611 241234"...
  const number = rawNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const keep = { number: rawNumber, phone: rawPhone };
  if (!/^HH[A-Z0-9]{6,}$/.test(number)) return { ...keep, error: "Enter your order number as shown in your confirmation email, e.g. HH2611241234." };
  const phone = normalizeKenyanPhone(rawPhone);
  if (!phone) return { ...keep, error: "That phone number doesn't look right. Use the number you gave at checkout, e.g. 0712 345 678." };
  // Per connection, and per phone number per day (so order numbers can't be guessed for a known phone).
  if (!(await allow(`track:${await clientIp()}`, 10, 15 * 60_000)) || !(await allow(`track:${phone}`, 20, 24 * 3_600_000))) return { ...keep, error: "Too many tries. Please wait 15 minutes, or call us and we'll check your order." };
  const order = await prisma.order.findFirst({ where: { number, phone }, select: { number: true, accessToken: true } });
  if (!order) return { ...keep, error: "We couldn't find an order with that number and phone number. Please check both and try again." };
  redirect(`/order/${order.number}?t=${order.accessToken}`);
}
