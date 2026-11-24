import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { ADDRESS_TYPES, ORDER_STATUS_LABEL } from "@/lib/config";
import { kes } from "@/lib/utils";
import { Breadcrumbs } from "@/components/Listing";
import { WishlistPage } from "@/components/Wishlist";
import { AddressForm, PasswordForm, ProfileForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

const TABS = [
  { key: "dashboard", label: "Dashboard", d: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { key: "orders", label: "My Orders", d: "M12 3 4.5 7v10L12 21l7.5-4V7zM12 12l7.5-5M12 12 4.5 7M12 12v9" },
  { key: "wishlist", label: "Wishlist", d: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" },
  { key: "address", label: "Address", d: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { key: "details", label: "Account Details", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "In progress" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const statusTone = (s: string) =>
  s === "delivered" ? "bg-[rgba(161,15,228,0.12)] text-brand-700" : s === "cancelled" ? "bg-[rgba(255,72,66,0.16)] text-[#ae013c]" : s === "awaiting_rx" || s === "pending_payment" ? "bg-[rgba(255,193,7,0.16)] text-[#b78103]" : "bg-[rgba(24,144,255,0.16)] text-[#0c53b7]";

const Svg = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string; f?: string }> }) {
  const session = await getSession();
  const { tab: t, f } = await searchParams;
  if (!session) redirect(`/login?next=${encodeURIComponent(t ? `/account?tab=${t}` : "/account")}`);
  const tab = TABS.some((x) => x.key === t) ? t! : "dashboard";
  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.uid } }),
    prisma.order.findMany({ where: { userId: session.uid }, orderBy: { createdAt: "desc" }, include: { items: { select: { qty: true } } } }),
  ]);
  if (!user) redirect("/login");
  const isOpen = (o: (typeof orders)[number]) => !["delivered", "cancelled"].includes(o.status);
  const open = orders.filter(isOpen).length;
  const spent = orders.filter((o) => o.paymentStatus === "paid").reduce((a, o) => a + o.total, 0);
  const filter = FILTERS.some((x) => x.key === f) ? f! : "all";
  const shown = orders.filter((o) => (filter === "open" ? isOpen(o) : filter === "all" ? true : o.status === filter));
  const initials = user.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const href = (key: string) => (key === "dashboard" ? "/account" : `/account?tab=${key}`);
  const current = TABS.find((x) => x.key === tab)!;

  const OrderList = ({ list }: { list: typeof orders }) =>
    list.length === 0 ? (
      <div className="rounded-2xl border border-line px-6 py-12 text-center">
        <Svg d={TABS[1].d} className="mx-auto h-10 w-10 text-faint" />
        <p className="mt-3 font-heading text-lg font-bold text-ink">No orders here yet</p>
        <p className="mt-1 text-sm text-muted">When you place an order it will show up here.</p>
        <Link href="/search" className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700">Start shopping</Link>
      </div>
    ) : (
      <>
        {/* Phones: one card per order */}
        <ul className="space-y-3 md:hidden">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.number}?t=${o.accessToken}`} className="block rounded-2xl border border-line p-4 transition-colors active:bg-well">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">#{o.number}</p>
                    <p className="mt-0.5 text-xs text-muted">{o.createdAt.toLocaleDateString("en-KE", { dateStyle: "medium" })}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(o.status)}`}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-line pt-3">
                  <p className="text-sm text-muted">
                    {o.items.reduce((a, i) => a + i.qty, 0)} item{o.items.reduce((a, i) => a + i.qty, 0) === 1 ? "" : "s"} · <b className="text-ink">{kes(o.total)}</b>
                  </p>
                  <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${o.status === "pending_payment" ? "bg-brand-600 text-white" : "border border-line text-ink"}`}>{o.status === "pending_payment" ? "Pay now" : "View"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {/* Tablets and up: table */}
        <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
          <table className="w-full text-[15px]">
            <thead className="bg-well text-left">
              <tr><th className="px-5 py-4 font-semibold">Order</th><th className="px-3 py-4 font-semibold">Date</th><th className="px-3 py-4 font-semibold">Items</th><th className="px-3 py-4 font-semibold">Total</th><th className="px-3 py-4 font-semibold">Status</th><th className="px-5 py-4 font-semibold">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="px-5 py-4 font-semibold">#{o.number}</td>
                  <td className="px-3 py-4 text-muted">{o.createdAt.toLocaleDateString("en-KE", { dateStyle: "medium" })}</td>
                  <td className="px-3 py-4 text-muted">{o.items.reduce((a, i) => a + i.qty, 0)}</td>
                  <td className="px-3 py-4 font-semibold">{kes(o.total)}</td>
                  <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(o.status)}`}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span></td>
                  <td className="px-5 py-4"><Link href={`/order/${o.number}?t=${o.accessToken}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${o.status === "pending_payment" ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-line hover:border-brand-600 hover:text-brand-600"}`}>{o.status === "pending_payment" ? "Pay now" : "View"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );

  const LogoutButton = ({ className = "" }: { className?: string }) => (
    <form action={logout}>
      <button className={`flex w-full items-center gap-x-4 rounded-lg p-4 font-semibold text-sale hover:bg-well ${className}`}>
        <Svg d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h10" />
        Log Out
      </button>
    </form>
  );

  return (
    <div className="container-x py-4 sm:py-6">
      <div className="hidden sm:block"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "My Account", href: "/account" }, ...(tab !== "dashboard" ? [{ name: current.label }] : [])]} /></div>

      {/* Phones: profile header + scrollable tabs instead of the long sidebar */}
      <div className="mb-5 lg:hidden">
        <div className={`items-center gap-3 rounded-2xl bg-brand-50 p-4 ${tab === "dashboard" ? "flex" : "hidden"}`}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-bold text-ink">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <nav className={`scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 ${tab === "dashboard" ? "mt-4" : ""}`} aria-label="Account sections">
          {TABS.map((x) => (
            <Link key={x.key} href={href(x.key)} aria-current={tab === x.key ? "page" : undefined} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${tab === x.key ? "bg-brand-600 text-white" : "border border-line bg-white text-ink"}`}>
              <Svg d={x.d} className="h-4 w-4" />
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden h-fit rounded-2xl border border-line p-4 lg:block">
          <div className="mb-3 flex items-center gap-3 border-b border-line px-2 pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{initials}</span>
            <div className="min-w-0"><p className="truncate font-semibold text-ink">{user.name}</p><p className="truncate text-xs text-muted">{user.email}</p></div>
          </div>
          <nav className="space-y-1" aria-label="Account">
            {TABS.map((x) => (
              <Link key={x.key} href={href(x.key)} aria-current={tab === x.key ? "page" : undefined} className={`flex w-full items-center gap-x-4 rounded-lg p-4 font-semibold transition-colors duration-300 ${tab === x.key ? "bg-brand-600 text-white" : "text-ink hover:bg-well"}`}>
                <Svg d={x.d} />
                {x.label}
              </Link>
            ))}
            {user.role !== "customer" && (
              <Link href="/admin" className="flex w-full items-center gap-x-4 rounded-lg p-4 font-semibold text-ink hover:bg-well">
                <Svg d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
                Admin dashboard
              </Link>
            )}
            <LogoutButton />
          </nav>
        </aside>

        <section className="min-w-0">
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-line p-5 sm:p-6">
                <h1 className="font-heading text-xl font-bold sm:text-2xl">Hello, {user.name.split(" ")[0]}</h1>
                <p className="mt-2 text-sm text-muted sm:text-base">From here you can check your orders, manage your delivery address and update your password and account details.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {([
                  ["Orders", String(orders.length), "bg-[rgba(239,214,252,0.8)]", href("orders")],
                  ["In progress", String(open), "bg-[rgba(255,235,105,0.6)]", "/account?tab=orders&f=open"],
                  ["Total spent", kes(spent), "bg-[rgba(160,226,224,0.6)]", href("orders")],
                ] as const).map(([l, v, bg, to]) => (
                  <Link key={l} href={to} className={`tile-tint rounded-2xl p-3 transition hover:-translate-y-0.5 sm:p-6 ${bg}`}>
                    <p className="text-xs font-semibold text-muted sm:text-sm">{l}</p>
                    <p className="mt-1 truncate font-heading text-base font-bold sm:text-2xl">{v}</p>
                  </Link>
                ))}
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold sm:text-xl">Recent Orders</h2>
                  {orders.length > 3 && <Link href={href("orders")} className="text-sm font-semibold text-brand-600">View all</Link>}
                </div>
                <OrderList list={orders.slice(0, 3)} />
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div>
              <h1 className="mb-3 font-heading text-xl font-bold sm:text-2xl">My Orders</h1>
              <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {FILTERS.map((x) => {
                  const n = x.key === "all" ? orders.length : x.key === "open" ? open : orders.filter((o) => o.status === x.key).length;
                  return (
                    <Link key={x.key} href={x.key === "all" ? href("orders") : `/account?tab=orders&f=${x.key}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${filter === x.key ? "bg-ink text-white" : "bg-well text-ink"}`}>
                      {x.label} <span className="opacity-60">{n}</span>
                    </Link>
                  );
                })}
              </div>
              <OrderList list={shown} />
            </div>
          )}

          {tab === "wishlist" && (
            <div>
              <h1 className="mb-4 font-heading text-xl font-bold sm:text-2xl">Wishlist</h1>
              <WishlistPage />
            </div>
          )}

          {tab === "address" && (
            <div className="rounded-2xl border border-line">
              <h1 className="rounded-t-2xl bg-well px-5 py-4 font-heading text-lg font-bold sm:px-6 sm:text-xl">My Address</h1>
              <div className="p-5 sm:p-6"><AddressForm v={user} types={ADDRESS_TYPES} /></div>
            </div>
          )}

          {tab === "details" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-line">
                <h1 className="rounded-t-2xl bg-well px-5 py-4 font-heading text-lg font-bold sm:px-6 sm:text-xl">Account Details</h1>
                <div className="p-5 sm:p-6"><ProfileForm name={user.name} email={user.email} phone={user.phone ? `0${user.phone.slice(3)}` : ""} /></div>
              </div>
              <div className="rounded-2xl border border-line">
                <h2 className="rounded-t-2xl bg-well px-5 py-4 font-heading text-lg font-bold sm:px-6 sm:text-xl">Change Password</h2>
                <div className="p-5 sm:p-6"><PasswordForm /></div>
              </div>
            </div>
          )}

          {/* Phones: admin link + log out at the end of the page */}
          <div className="mt-6 space-y-1 border-t border-line pt-4 lg:hidden">
            {user.role !== "customer" && (
              <Link href="/admin" className="flex w-full items-center gap-x-4 rounded-lg p-4 font-semibold text-ink hover:bg-well">
                <Svg d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
                Admin dashboard
              </Link>
            )}
            <LogoutButton />
          </div>
        </section>
      </div>
    </div>
  );
}
