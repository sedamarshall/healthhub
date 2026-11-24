"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RAbandonedCart, RAdmin, RCategory, RCoupon, RCustomer, RDashboard, RFaq, RFlashSales, RGeneralSettings, RHeaderChat, RHeaderChevron, RHeaderMenu, RHomePage, RInbox, RInventory, RMenuLogout, RMenuProfile, ROrders, RPaymentApi, RPrivacy, RProduct, RRefunds, RSalesReports, RSeoSettings, RShopSettings, RSupport, RTerms, RTopProducts, RTransactions } from "./ref-icons";
import { NotificationBell } from "./NotificationBell";
import { NavProgress } from "./NavProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IAdmin, IBell, IBolt, IBox, ICart, ICategory, IChart, IChat, IChevronDown, IChevronLeft, IChevronRight, IDashboard, IDoc, IHelp,
  IInventory, ILogout, IMenu, IRefund, IRx, ISearch, ISettings, IShield, IStore, ITag, ITransaction, IUsers,
} from "./icons";

type Item = { label: string; href?: string; icon: React.ReactNode; badge?: number; children?: { label: string; href: string }[]; admin?: boolean };
type Section = { title?: string; items: Item[] };

export function AdminShell({
  user,
  counts,
  logoutAction,
  children,
}: {
  user: { name: string; email: string; role: string; avatar?: string | null };
  counts: { pendingRx: number; toFulfil: number; toReview: number; newMessages: number; newOrders: number };
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user.role === "admin";

  useEffect(() => setMobileOpen(false), [pathname]);

  const sections: Section[] = [
    { items: [{ label: "Dashboard", href: "/admin", icon: <RDashboard /> }] },
    {
      title: "Product Management",
      items: [
        {
          label: "Manage Product",
          icon: <RProduct />,
          admin: true,
          children: [
            { label: "All Products", href: "/admin/products" },
            { label: "Draft Products", href: "/admin/products/drafts" },
            { label: "Stock Products", href: "/admin/products/stocks" },
            { label: "Product Review", href: "/admin/products/reviews" },
          ],
        },
        {
          label: "Categories & Attributes",
          icon: <RCategory />,
          admin: true,
          children: [
            { label: "Category List", href: "/admin/categories" },
            { label: "Tag List", href: "/admin/tags" },
            { label: "Brand List", href: "/admin/brands" },
          ],
        },
        { label: "Manage Inventory", href: "/admin/inventory", icon: <RInventory />, admin: true },
      ],
    },
    {
      title: "Order Management",
      items: [
        {
          label: "Orders",
          icon: <ROrders />,
          badge: counts.toFulfil,
          children: [
            { label: "All Orders", href: "/admin/orders" },
            { label: "Return & Refund", href: "/admin/refunds" },
            { label: "Abandoned Cart", href: "/admin/abandoned-carts" },
            { label: "Transactions", href: "/admin/transactions" },
          ],
        },
        { label: "Prescriptions", href: "/admin/prescriptions", icon: <IRx />, badge: counts.pendingRx },
        { label: "Abandoned cart", href: "/admin/abandoned-carts", icon: <RAbandonedCart />, admin: true },
        { label: "Transactions", href: "/admin/transactions", icon: <RTransactions /> },
      ],
    },
    {
      title: "Customer Management",
      items: [
        { label: "Customers", href: "/admin/customers", icon: <RCustomer />, admin: true },
      ],
    },
    {
      title: "User Management",
      items: [
        { label: "Users (Staff)", href: "/admin/users", icon: <RAdmin />, admin: true },
      ],
    },
    {
      title: "Reports & Analytics",
      items: [
        { label: "Sales reports", href: "/admin/reports/sales", icon: <RSalesReports />, admin: true },
        { label: "Top products, categories", href: "/admin/reports/top-products", icon: <RTopProducts />, admin: true },
      ],
    },
    {
      title: "Finance Management",
      items: [{ label: "Refunds", href: "/admin/refunds", icon: <RRefunds />, admin: true }],
    },
    {
      title: "Promotional Deals",
      items: [
        { label: "Coupon", href: "/admin/coupons", icon: <RCoupon />, admin: true },
        { label: "Flash Sales", href: "/admin/flash-sales", icon: <RFlashSales />, admin: true },
      ],
    },
    {
      title: "Content Management",
      items: [
        { label: "Home Page Control", href: "/admin/home-page", icon: <RHomePage />, admin: true },
        { label: "FAQ", href: "/admin/content/faq", icon: <RFaq />, admin: true },
        { label: "Privacy Policy", href: "/admin/content/privacy", icon: <RPrivacy />, admin: true },
        { label: "Terms & Condition", href: "/admin/content/terms", icon: <RTerms />, admin: true },
        { label: "About Us", href: "/admin/content/about", icon: <RSupport />, admin: true },
      ],
    },
    {
      title: "Help & Support",
      items: [{ label: "Inbox", href: "/admin/messages", icon: <RInbox />, badge: counts.newMessages }],
    },
    {
      title: "Settings",
      items: [
        { label: "General Settings", href: "/admin/settings/general", icon: <RGeneralSettings />, admin: true },
        { label: "Shipping Methods", href: "/admin/settings/shipping", icon: <RShopSettings />, admin: true },
        { label: "SEO Settings", href: "/admin/settings/seo", icon: <RSeoSettings />, admin: true },
        { label: "Payment API", href: "/admin/settings/payment", icon: <RPaymentApi />, admin: true },
        { label: "Email Settings", href: "/admin/settings/email", icon: <RInbox />, admin: true },
        { label: "Maintains Settings", href: "/admin/settings/maintenance", icon: <RTopProducts />, admin: true },
      ],
    },
    { title: "Store", items: [{ label: "View shop", href: "/", icon: <RHomePage /> }] },
  ];

  const sidebar = (mini: boolean) => (
    <div className="flex h-full flex-col bg-[#560879] text-white">
      <div className="relative flex h-[70px] shrink-0 items-center gap-2 p-4">
        <Link href="/admin" className="keep-white flex items-center rounded-lg bg-white p-1.5" aria-label="Health Hub admin home">
          {mini ? (
            <Image src="/brand/favicon.png" alt="Health Hub" width={28} height={28} className="h-7 w-7" />
          ) : (
            <Image src="/brand/logo.png" alt="Health Hub Chemist" width={140} height={40} className="h-9 w-auto" />
          )}
        </Link>
      </div>
      <nav className="flex-1 space-y-5 sidebar-scroll overflow-y-auto px-4 pb-6 pt-2">
        {sections.map((sec, i) => {
          const items = sec.items.filter((it) => !it.admin || isAdmin);
          if (!items.length) return null;
          return (
            <div key={i}>
              {sec.title && !mini && <p className="mb-2 px-4 text-xs font-medium uppercase text-[#7ee8d6]">{sec.title}</p>}
              <ul className="space-y-1">
                {items.map((it) => (
                  <NavItem key={it.label} item={it} mini={mini} pathname={pathname} />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="admin flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 transition-[width] duration-300 lg:block ${collapsed ? "w-[88px]" : "w-[280px]"}`}>
        {sidebar(collapsed)}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#dfe3e8] bg-white text-[#212529] shadow-sm hover:bg-[#f9fafb]"
        >
          <IChevronLeft className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px]">{sidebar(false)}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <NavProgress />
        <TopBar user={user} counts={counts} onMenu={() => setMobileOpen(true)} logoutAction={logoutAction} />
        <div className="flex-1 bg-[rgba(161,15,228,0.08)]">
          <main className="px-4 py-4 sm:px-6 sm:py-6 xl:px-10">
            <div className="rounded-2xl bg-white p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({ item, mini, pathname }: { item: Item; mini: boolean; pathname: string }) {
  const params = useSearchParams();
  const full = pathname + (params.toString() ? `?${params}` : "");
  const all = item.children?.map((c) => c.href) ?? (item.href ? [item.href] : []);
  const matches = (href: string) => {
    const [p, q] = href.split("?");
    if (q) return full === href;
    if (p === "/admin") return pathname === "/admin";
    if (pathname === p) return true;
    // prefix match, unless a more specific sibling link matches
    return pathname.startsWith(p + "/") && !all.some((h) => h !== href && h.length > href.length && pathname.startsWith(h.split("?")[0]));
  };
  const childActive = item.children?.some((c) => matches(c.href));
  const [open, setOpen] = useState(!!childActive);
  const active = item.href ? item.href !== "/" && matches(item.href) : false;
  const groupOpen = !!item.children && open && !mini;
  const base = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    groupOpen ? "bg-[#efd6fc] font-semibold text-[#a10fe4]" : active ? "bg-[#850cbd] text-white" : "text-white hover:bg-white/10"
  } ${mini ? "justify-center px-0" : ""}`;

  const inner = (
    <>
      <span className="shrink-0">{item.icon}</span>
      {!mini && <span className="flex-1 truncate text-left">{item.label}</span>}
      {!mini && !!item.badge && <span className="rounded-full bg-[#7ee8d6] px-1.5 text-[11px] font-bold leading-5 text-[#560879]">{item.badge}</span>}
      {!mini && item.children && <IChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />}
    </>
  );

  if (item.children) {
    return (
      <li>
        {mini ? (
          <Link href={item.children[0].href} className={base} title={item.label}>{inner}</Link>
        ) : (
          <button type="button" onClick={() => setOpen((o) => !o)} className={base} aria-expanded={open}>{inner}</button>
        )}
        {groupOpen && (
          <div className="relative mt-1">
            <div className="absolute bottom-[18px] left-[19px] top-[18px] w-[2px] bg-white/15" />
            {item.children.map((c) => {
              const on = matches(c.href);
              return (
                <Link key={c.href} href={c.href} className={`relative block py-2 pl-[40px] text-sm transition-colors ${on ? "font-semibold text-[#5ed9ba]" : "text-white hover:text-[#5ed9ba]"}`}>
                  <span className={`absolute left-[16px] top-[14px] h-2 w-2 rounded-full ${on ? "bg-[#5ed9ba]" : ""}`} />
                  {c.label}
                </Link>
              );
            })}
          </div>
        )}
      </li>
    );
  }
  return (
    <li>
      <Link href={item.href!} className={base} title={mini ? item.label : undefined} target={item.href === "/" ? "_blank" : undefined}>
        {inner}
      </Link>
    </li>
  );
}

function TopBar({
  user,
  counts,
  onMenu,
  logoutAction,
}: {
  user: { name: string; email: string; role: string; avatar?: string | null };
  counts: { pendingRx: number; toFulfil: number; newMessages: number; newOrders: number };
  onMenu: () => void;
  logoutAction: () => Promise<void>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const initials = user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 bg-white px-4 py-4 sm:px-6 xl:px-10">
      <button onClick={onMenu} className="text-[#212529] lg:hidden" aria-label="Open menu">
        <RHeaderMenu className="h-7 w-7" />
      </button>
      <form
        className="relative w-full max-w-[344px]"
        onSubmit={(e) => {
          e.preventDefault();
          const term = q.trim();
          if (!term) return;
          router.push(/^HH\d+/i.test(term) ? `/admin/orders?q=${encodeURIComponent(term)}` : `/admin/products?q=${encodeURIComponent(term)}`);
        }}
      >
        <ISearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#212529]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          aria-label="Search products, or order number"
          className="h-10 w-full rounded-full bg-[#f9fafb] py-2 pl-10 pr-3.5 text-sm outline-none shadow-[0_0_0_1px_rgba(145,158,171,0.2)] focus:shadow-[0_0_0_2px_#a10fe4]"
        />
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle className="text-[#212529] hover:bg-[#f4f6f8]" />
        <Link href="/admin/messages" className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#212529] transition-colors hover:bg-[#f4f6f8]" aria-label={`Inbox, ${counts.newMessages} new message${counts.newMessages === 1 ? "" : "s"}`} title="Inbox">
          <RHeaderChat className="h-6 w-6" />
          {counts.newMessages > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#1cbba3] px-1 text-[10px] font-bold text-white">{counts.newMessages}</span>
          )}
        </Link>
        <NotificationBell initialUnread={counts.newOrders} />
        <div className="relative" ref={ref}>
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2.5 text-left" aria-expanded={menu} aria-haspopup="menu">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efd6fc] text-sm font-bold text-[#850cbd]">{initials}</span>
            )}
            <span className="hidden sm:block">
              <span className="block text-base font-bold leading-tight text-[#212529]">{user.name}</span>
              <span className="block text-sm leading-tight text-[#212529]">{user.role === "admin" ? "Master" : user.role === "pharmacist" ? "Pharmacist" : user.role}</span>
            </span>
            <RHeaderChevron className={`h-5 w-5 text-[#212529] transition-transform duration-200 ${menu ? "rotate-180" : ""}`} />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-xl border border-[rgba(145,158,171,0.16)] bg-white p-1.5 shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)]">
              {[
                { label: "Profile", href: "/admin/profile", icon: <RMenuProfile className="h-4 w-4" /> },
                { label: "Dashboard", href: "/admin", icon: <RDashboard className="h-4 w-4" /> },
                ...(user.role === "admin" ? [{ label: "Settings", href: "/admin/settings/general", icon: <RGeneralSettings className="h-4 w-4" /> }] : []),
                { label: "View shop", href: "/", icon: <RHomePage className="h-4 w-4" /> },
              ].map((i) => (
                <Link key={i.label} role="menuitem" href={i.href} onClick={() => setMenu(false)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[#637381] transition-colors hover:bg-[#f9fafb] hover:text-[#212529]">
                  {i.icon} {i.label}
                </Link>
              ))}
              <form action={logoutAction} className="mt-1 border-t border-[rgba(145,158,171,0.16)] pt-1">
                <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[#637381] transition-colors hover:bg-[#fff1f0] hover:text-[#cb0233]">
                  <RMenuLogout className="h-4 w-4" /> Logout
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
