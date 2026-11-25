import Link from "next/link";
import Image from "next/image";
import { getNav } from "@/lib/catalog";
import { getCartCount } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { kes } from "@/lib/utils";
import { SearchBox } from "./SearchBox";
import { CategoryIcon } from "./CategoryIcon";
import { ThemeToggle } from "./ThemeToggle";
import { AccountMenu } from "./AccountMenu";
import { CartButton } from "./CartDrawer";
import { MobileMenu } from "./MobileMenu";
import { ChevronDown, GridIcon, HeadsetIcon, PhoneIcon, TruckIcon } from "./Icons";

/** Health Hub Chemist logo (from the old healthhub.ke site, served locally). On dark backgrounds it sits on a white chip. */
export function Logo({ light = false }: { light?: boolean }) {
  const img = <Image src="/brand/logo.png" alt="Health Hub Chemist" width={140} height={40} priority className="h-10 w-auto lg:h-[45px]" />;
  return (
    <Link href="/" className={light ? "keep-white inline-flex rounded-xl bg-white px-4 py-2.5" : "logo-chip flex items-center"} aria-label="Health Hub Chemist home">
      {img}
    </Link>
  );
}

// Nav links shown next to "Explore All Categories" (by category slug)
const QUICK = ["multi-vitamins", "baby-and-mum", "skin-care", "first-aid"];

export async function Header() {
  const [nav, count, session, s] = await Promise.all([getNav(), getCartCount(), getSession(), getSettings()]);
  const quick = QUICK.map((q) => nav.find((c) => c.slug === q)).filter((c): c is (typeof nav)[number] => !!c);
  const phone = s.phone;
  const tel = `tel:${phone.replace(/\s/g, "")}`;
  const accountHref = session ? (session.role === "customer" ? "/account" : "/admin") : "/login";

  return (
    <header className="relative z-40 bg-white">
      {/* Top bar: full on desktop, single centred promo on mobile */}
      <div className="bg-brand-600 text-sm text-white">
        <div className="container-x relative flex h-10 items-center justify-center gap-6 pr-12 lg:justify-start lg:pr-4">
          <span className="hidden items-center gap-2 lg:flex">
            <HeadsetIcon className="h-4 w-4" /> Need Support? Call Us
            <a href={tel} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-ink">{phone}</a>
          </span>
          <span className="flex items-center gap-2">
            <TruckIcon className="h-4 w-4" /> Free delivery over {kes(Number(s.freeDeliveryOver))}
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-ink">Same day</span>
            <span className="hidden sm:inline">in Nairobi</span>
          </span>
          <nav className="ml-auto hidden items-center divide-x divide-white/30 lg:flex">
            <Link href={accountHref} className="px-3 hover:underline">My Account</Link>
            <Link href="/wishlist" className="px-3 hover:underline">My Wishlist</Link>
            <Link href="/track-order" className="pl-3 hover:underline">Order Tracking</Link>
          </nav>
          <ThemeToggle className="absolute right-2 h-8 w-8 text-white hover:bg-white/15 lg:static lg:ml-1" />
        </div>
      </div>

      {/* Main row: menu · centred logo · cart on mobile; logo · search · account · cart on desktop */}
      <div className="border-b border-line">
        <div className="container-x grid h-[76px] grid-cols-[48px_1fr_48px] items-center gap-3 lg:flex lg:h-[88px] lg:gap-4">
          <MobileMenu categories={nav} />
          <div className="flex justify-center lg:block"><Logo /></div>
          <div className="mx-auto hidden w-full max-w-[540px] lg:block">
            <SearchBox />
          </div>
          <div className="flex items-center justify-end gap-6">
            <AccountMenu session={session ? { name: session.name, role: session.role } : null} />
            <CartButton count={count} />
          </div>
        </div>
        <div className="container-x pb-4 lg:hidden">
          <SearchBox />
        </div>
      </div>

      {/* Nav row (desktop) */}
      <div className="hidden border-b border-line lg:block">
        <div className="container-x flex h-[60px] items-center gap-8">
          <div className="group relative">
            <button className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-brand-600 px-4 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(161,15,228,0.24)] transition-colors hover:bg-brand-700">
              <GridIcon className="h-4 w-4" /> Explore All Categories <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
            </button>
            {/* pt-2 keeps the hover alive across the gap between button and panel */}
            <div className="invisible absolute left-0 top-full z-50 w-[340px] translate-y-4 pt-2 opacity-0 transition-all duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <ul className="max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-white px-5 py-3 shadow-[0_12px_24px_-4px_rgba(145,158,171,0.16),0_0_2px_0_rgba(145,158,171,0.2)]">
                {nav.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-0">
                    <Link href={`/c/${c.slug}`} className="flex items-center gap-4 py-2.5 text-base text-ink transition hover:text-brand-600">
                      <CategoryIcon slug={c.slug} name={c.name} />
                      <span className="flex-1">{c.name}</span>
                      {c.children.length > 0 && <ChevronDown className="h-4 w-4 -rotate-90" />}
                    </Link>
                  </li>
                ))}
                <li className="pt-2">
                  <Link href="/categories" className="flex h-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 hover:bg-brand-100">View all categories</Link>
                </li>
              </ul>
            </div>
          </div>

          <nav className="flex flex-1 items-center gap-7 text-base font-semibold text-ink" aria-label="Main">
            <Link href="/" className="text-brand-600">Home</Link>
            <Link href="/search" className="hover:text-brand-600">Shop</Link>
            {quick.map((c) => (
              <div key={c.id} className="group relative">
                <Link href={`/c/${c.slug}`} className="flex items-center gap-1 whitespace-nowrap hover:text-brand-600">
                  {c.name}
                  {c.children.length > 0 && <ChevronDown className="h-4 w-4" />}
                </Link>
                {c.children.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-50 pt-4 opacity-0 transition group-hover:visible group-hover:opacity-100">
                    <div className="min-w-60 rounded-2xl border border-line bg-white py-2 shadow-xl">
                      {c.children.map((sub) => (
                        <Link key={sub.id} href={`/c/${sub.slug}`} className="block px-5 py-2 text-sm font-normal text-muted hover:bg-well hover:text-brand-600">{sub.name}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link href="/contact" className="hover:text-brand-600">Contact</Link>
          </nav>

          <a href={tel} className="ml-auto flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-well text-ink"><PhoneIcon className="h-[18px] w-[18px]" /></span>
            <span className="leading-tight">
              <span className="block text-xs text-muted">24/7 Support</span>
              <span className="block whitespace-nowrap text-[15px] text-ink">{phone}</span>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
