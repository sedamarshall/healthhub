"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { FavouriteIcon, Home01Icon, PackageMovingIcon, UserCircleIcon } from "@hugeicons/core-free-icons";

/**
 * Mobile bottom bar, same icons as the reference storefront (Hugeicons stroke: home-01,
 * package-moving, favourite, user-circle). "My Order" goes to your orders (or Track Order when
 * you're not signed in); "My Account" goes to your account dashboard (or Log in).
 */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  const inOrders = (path === "/account" && tab === "orders") || path.startsWith("/order") || path === "/track-order";
  const inAccount = (path === "/account" && tab !== "orders" && tab !== "wishlist") || ["/login", "/register", "/forgot-password", "/reset-password"].includes(path);
  const items: { href: string; label: string; icon: IconSvgElement; on: boolean }[] = [
    { href: "/", label: "Home", icon: Home01Icon, on: path === "/" },
    { href: signedIn ? "/account?tab=orders" : "/track-order", label: "My Order", icon: PackageMovingIcon, on: inOrders },
    { href: "/wishlist", label: "Wishlist", icon: FavouriteIcon, on: path === "/wishlist" || (path === "/account" && tab === "wishlist") },
    { href: signedIn ? "/account" : "/login", label: signedIn ? "My Account" : "Log In", icon: UserCircleIcon, on: inAccount },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[#dfe3e8] bg-white pb-3 lg:hidden" aria-label="Quick links">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          aria-current={i.on ? "page" : undefined}
          className={`flex flex-col items-center gap-y-1 border-t-2 px-[9px] pb-1 pt-2.5 text-sm leading-[22px] transition-colors ${i.on ? "border-brand-600 text-brand-600" : "border-transparent text-ink"}`}
        >
          <span className="inline-flex items-center justify-center"><HugeiconsIcon icon={i.icon} size={24} strokeWidth={1.5} /></span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
