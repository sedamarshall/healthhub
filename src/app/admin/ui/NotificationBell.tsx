"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getOrderNotifications, markOrderNotificationsRead, type OrderNote } from "../notifications";
import { ORDER_STATUS_LABEL } from "@/lib/config";
import { RHeaderBell } from "./ref-icons";

const POLL_MS = 30_000;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

const tone = (o: OrderNote) =>
  o.status === "cancelled" ? "bg-[rgba(255,72,66,0.16)] text-[#b71d18]"
  : o.paid ? "bg-[rgba(161,15,228,0.12)] text-[#850cbd]"
  : o.status === "awaiting_rx" ? "bg-[rgba(255,193,7,0.16)] text-[#b78103]"
  : "bg-[rgba(145,158,171,0.16)] text-[#637381]";

/**
 * Header bell: red count of orders received since you last looked, and a dropdown of the latest
 * orders. Checks for new orders every 30 seconds while the tab is visible.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<OrderNote[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await getOrderNotifications();
      setUnread(r.unread);
      setItems(r.items);
      return r;
    } catch {
      return null;
    }
  }, []);

  // Poll for new orders while the admin is open.
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && load();
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("click", click); document.removeEventListener("keydown", key); };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await load();
  };

  const markAll = async () => {
    await markOrderNotificationsRead();
    setUnread(0);
    setItems((list) => list?.map((i) => ({ ...i, unread: false })) ?? list);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full text-[#212529] transition-colors hover:bg-[#f4f6f8] ${open ? "bg-[#f4f6f8]" : ""}`}
        aria-label={unread ? `${unread} new order${unread === 1 ? "" : "s"}` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Orders received"
      >
        <RHeaderBell className={`h-6 w-6 ${unread ? "origin-top animate-[bell_1s_ease-in-out_2]" : ""}`} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#cb0233] px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Order notifications" className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl bg-white shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)]">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-base font-semibold text-[#212529]">Notifications</p>
              <p className="text-sm text-[#637381]">{unread ? `You have ${unread} new order${unread === 1 ? "" : "s"}` : "You're all caught up"}</p>
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="shrink-0 text-sm font-semibold text-[#a10fe4] hover:underline">Mark all as read</button>
            )}
          </div>
          <div className="border-t border-dashed border-[rgba(145,158,171,0.24)]" />
          <ul className="max-h-[420px] overflow-y-auto py-1">
            {items === null && Array.from({ length: 3 }, (_, i) => <li key={i} className="mx-5 my-3 h-12 animate-pulse rounded-lg bg-[#f4f6f8]" />)}
            {items?.length === 0 && <li className="px-5 py-10 text-center text-sm text-[#919eab]">No orders yet.</li>}
            {items?.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 px-5 py-3 transition-colors hover:bg-[#f9fafb] ${o.unread ? "bg-[rgba(161,15,228,0.06)]" : ""}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#efd6fc] text-[#850cbd]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[#212529]">
                      <b className="font-semibold">New order #{o.number}</b> from {o.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#919eab]">
                      <span className="font-semibold text-[#212529]">KES {o.total.toLocaleString("en-KE")}</span>
                      <span className={`rounded-md px-1.5 py-0.5 font-bold ${tone(o)}`}>{o.paid ? "Paid" : ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                      <span>{ago(o.createdAt)}</span>
                    </span>
                  </span>
                  {o.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#a10fe4]" aria-label="New" />}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-dashed border-[rgba(145,158,171,0.24)] p-2">
            <Link href="/admin/orders" onClick={() => setOpen(false)} className="flex h-10 items-center justify-center rounded-lg text-sm font-bold text-[#212529] hover:bg-[#f9fafb]">View all orders</Link>
          </div>
        </div>
      )}
    </div>
  );
}
