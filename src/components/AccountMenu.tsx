"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  DashboardSquare02Icon, FavouriteIcon, Location01Icon, LockKeyIcon, Login03Icon, Logout03Icon, PackageDeliveredIcon,
  SquareLock02Icon, UserAccountIcon, UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { logout } from "@/app/actions/auth";
import { LoginForm, RegisterForm } from "./AuthForms";
import { PanelClose, PanelHead, SidePanel } from "./SidePanel";
import { ChevronDown } from "./Icons";

type Session = { name: string; role: string } | null;

/** Header account button: hover dropdown like the reference, with log-in / sign-up side panels. */
export function AccountMenu({ session }: { session: Session }) {
  const [panel, setPanel] = useState<null | "login" | "register">(null);
  const close = useCallback(() => setPanel(null), []);
  const pathname = usePathname();
  // After signing in from the panel, stay on the page you were on (but not on the auth pages themselves).
  const next = /^\/(login|register|forgot-password|reset-password)/.test(pathname) ? undefined : pathname;

  useEffect(() => {
    const onOpen = (e: Event) => setPanel(((e as CustomEvent).detail as "login" | "register") ?? "login");
    window.addEventListener("hh:auth-open", onOpen);
    return () => window.removeEventListener("hh:auth-open", onOpen);
  }, []);

  const staff = session && session.role !== "customer";
  const items: { label: string; icon: IconSvgElement; href?: string; onClick?: () => void }[] = session
    ? [
        ...(staff ? [{ label: "Admin Dashboard", icon: DashboardSquare02Icon, href: "/admin" }] : []),
        { label: "My Account", icon: UserAccountIcon, href: "/account" },
        { label: "My Orders", icon: PackageDeliveredIcon, href: "/account?tab=orders" },
        { label: "Wishlist", icon: FavouriteIcon, href: "/wishlist" },
        { label: "Address", icon: Location01Icon, href: "/account?tab=address" },
        { label: "Change Password", icon: SquareLock02Icon, href: "/account?tab=details" },
      ]
    : [
        { label: "Login", icon: Login03Icon, onClick: () => setPanel("login") },
        { label: "Register", icon: UserAdd01Icon, onClick: () => setPanel("register") },
        { label: "Forget Password", icon: SquareLock02Icon, href: "/forgot-password" },
      ];

  const row = "group/item flex w-full items-center gap-x-2 py-2 text-left text-base text-ink transition-colors hover:text-brand-600";
  const bubble = (icon: IconSvgElement) => (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] transition-colors group-hover/item:bg-[rgba(161,15,228,0.08)]">
      <HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} />
    </span>
  );

  return (
    <>
      <div className="group relative hidden lg:block">
        <button type="button" aria-haspopup="menu" aria-label={session ? `Account: ${session.name}` : "Account: log in"} className="flex items-center gap-2.5 py-3" onClick={() => !session && setPanel("login")}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
            <HugeiconsIcon icon={LockKeyIcon} size={22} strokeWidth={1.6} />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-xs text-muted">Account</span>
            <span className="block text-[15px] text-ink">{session ? session.name.split(" ")[0] : "log in"}</span>
          </span>
          <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
        </button>
        <ul
          role="menu"
          className="invisible absolute right-0 top-full z-50 w-[250px] translate-y-4 rounded-lg bg-white py-2 opacity-0 shadow-[0_12px_24px_-4px_rgba(145,158,171,0.16),0_0_2px_0_rgba(145,158,171,0.2)] transition-all duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
        >
          {items.map((it) => (
            <li key={it.label} className="px-4" role="none">
              {it.href ? (
                <Link role="menuitem" href={it.href} className={row}>{bubble(it.icon)}{it.label}</Link>
              ) : (
                <button role="menuitem" type="button" onClick={it.onClick} className={row}>{bubble(it.icon)}{it.label}</button>
              )}
            </li>
          ))}
          {session && (
            <li className="mt-1 border-t border-line px-4 pt-1" role="none">
              <form action={logout}>
                <button role="menuitem" className={`${row} hover:!text-sale`}>{bubble(Logout03Icon)}Log Out</button>
              </form>
            </li>
          )}
        </ul>
      </div>

      <SidePanel open={panel !== null} onClose={close} label={panel === "register" ? "Sign up" : "Log in"}>
        <div className="relative flex h-full flex-col">
          <PanelHead title={panel === "register" ? "Sign Up" : "Log In"} />
          <PanelClose onClick={close} />
          <div className="flex flex-1 flex-col gap-y-8 overflow-y-auto p-6 sm:p-10">
            <div className="relative mx-auto h-40 w-full max-w-[320px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/auth.svg" alt="" className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <div>
              <h4 className="font-heading text-2xl font-bold text-ink">{panel === "register" ? "Create your account" : "Welcome back"}</h4>
              <p className="mt-1 text-muted">{panel === "register" ? "Track orders, save addresses and check out faster." : "Log in to see your orders and check out faster."}</p>
            </div>
            {panel === "register" ? <RegisterForm key="r" next={next} onSwitch={() => setPanel("login")} /> : <LoginForm key="l" next={next} onSwitch={() => setPanel("register")} />}
          </div>
        </div>
      </SidePanel>
    </>
  );
}
