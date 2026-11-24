import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getNav } from "@/lib/catalog";
import { Logo } from "./Header";
import { SocialLinks } from "./Social";
import { ChevronRight, MailIcon, PhoneIcon, PinIcon } from "./Icons";

export async function Footer() {
  const [nav, st] = await Promise.all([getNav(), getSettings()]);
  const tel = st.phone.replace(/\s/g, "");
  const col = "mb-5 font-heading text-lg font-bold text-white";
  const link = "flex items-center gap-2 py-1.5 text-[15px] text-white/85 hover:text-accent";

  return (
    <footer className="mt-16 pb-20 lg:pb-0">
      {/* Notch CTA (in place of a newsletter): talk to a pharmacist */}
      <div className="container-x">
        <div className="text-center">
          <h2 className="section-title">Need help choosing?</h2>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-faint">Our pharmacists can advise on medicines, dosages and alternatives. Call or WhatsApp us any time we&apos;re open.</p>
        </div>
      </div>
      <div className="relative mt-8 bg-brand-900 text-white">
        <div className="absolute left-1/2 top-0 flex h-[88px] w-[min(560px,92%)] -translate-x-1/2 items-start justify-center rounded-b-[44px] bg-white px-4 pt-3">
          <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-4 shadow-sm">
            <PhoneIcon className="h-5 w-5 shrink-0 text-muted" />
            <span className="flex-1 truncate text-left text-[15px] text-muted">{st.phone}</span>
            <a href={`tel:${tel}`} className="btn-primary h-10 px-5">Call now</a>
          </div>
        </div>

        <div className="container-x grid gap-10 pb-10 pt-32 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/85">
              Kenya&apos;s online pharmacy and health shop. Genuine medicines, vitamins and personal care, delivered to your door.
            </p>
            {st.ppbLicence && <p className="mt-3 text-xs text-white/70">Pharmacy & Poisons Board licence no. {st.ppbLicence}</p>}
            <SocialLinks s={st} className="mt-5" btn="border border-white/30 text-white hover:bg-white hover:text-brand-900" />
          </div>
          <div>
            <h3 className={col}>Shop</h3>
            <ul>
              <li><Link href="/search" className={link}><ChevronRight className="h-3.5 w-3.5" /> All products</Link></li>
              <li><Link href="/search?sort=newest" className={link}><ChevronRight className="h-3.5 w-3.5" /> New arrivals</Link></li>
              <li><Link href="/search?sort=popular" className={link}><ChevronRight className="h-3.5 w-3.5" /> Best sellers</Link></li>
              <li><Link href="/wishlist" className={link}><ChevronRight className="h-3.5 w-3.5" /> Wishlist</Link></li>
              <li><Link href="/about-us" className={link}><ChevronRight className="h-3.5 w-3.5" /> About Us</Link></li>
              <li><Link href="/faq" className={link}><ChevronRight className="h-3.5 w-3.5" /> FAQ</Link></li>
              <li><Link href="/privacy-policy" className={link}><ChevronRight className="h-3.5 w-3.5" /> Privacy Policy</Link></li>
              <li><Link href="/terms" className={link}><ChevronRight className="h-3.5 w-3.5" /> Terms & Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={col}>My Account</h3>
            <ul>
              <li><Link href="/account" className={link}><ChevronRight className="h-3.5 w-3.5" /> Your account</Link></li>
              <li><Link href="/track-order" className={link}><ChevronRight className="h-3.5 w-3.5" /> Order tracking</Link></li>
              <li><Link href="/contact" className={link}><ChevronRight className="h-3.5 w-3.5" /> Contact us</Link></li>
              <li><Link href="/login" className={link}><ChevronRight className="h-3.5 w-3.5" /> Sign in</Link></li>
              <li><Link href="/register" className={link}><ChevronRight className="h-3.5 w-3.5" /> Create account</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={col}>Categories</h3>
            <ul>
              {nav.slice(0, 6).map((c) => (
                <li key={c.id}><Link href={`/c/${c.slug}`} className={link}><ChevronRight className="h-3.5 w-3.5" /> {c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={col}>Contact Information</h3>
            <ul className="space-y-3 text-[15px] text-white/85">
              <li className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30"><PinIcon className="h-4 w-4" /></span> {st.address}</li>
              <li className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30"><PhoneIcon className="h-4 w-4" /></span> <a href={`tel:${tel}`} className="hover:text-accent">Call / WhatsApp: {st.phone}</a></li>
              <li className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30"><MailIcon className="h-4 w-4" /></span> <a href={`mailto:${st.email}`} className="hover:text-accent">{st.email}</a></li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-md bg-white px-2.5 py-1.5 text-[#4caf50]">M-PESA</span>
              <span className="rounded-md bg-white px-2.5 py-1.5 text-[#e40000]">AIRTEL MONEY</span>
              <span className="rounded-md bg-white px-2.5 py-1.5 text-[#1a1f71]">VISA</span>
              <span className="rounded-md bg-white px-2.5 py-1.5 text-[#eb001b]">Mastercard</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/15">
          <p className="container-x py-5 text-center text-sm text-white/80">© {new Date().getFullYear()} {st.storeName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
