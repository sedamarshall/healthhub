import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/Listing";
import { MessageForm } from "@/components/MessageForm";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/Icons";
import { SocialLinks, waLink } from "@/components/Social";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";

export const metadata: Metadata = { title: "Contact Us", description: "Contact Health Hub Chemist: call, WhatsApp or send us a message." };

export default async function ContactPage() {
  const s = await getSettings();
  const tel = s.phone.replace(/\s/g, "");
  const cards = [
    { icon: <PhoneIcon className="h-6 w-6" />, t: "Call us", v: s.phone, href: `tel:${tel}` },
    ...(s.whatsapp ? [{ icon: <HugeiconsIcon icon={WhatsappIcon} size={24} />, t: "WhatsApp", v: s.whatsapp, href: waLink(s.whatsapp) }] : []),
    { icon: <MailIcon className="h-6 w-6" />, t: "Email", v: s.email, href: `mailto:${s.email}` },
    { icon: <PinIcon className="h-6 w-6" />, t: "Visit us", v: s.address },
  ];
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Contact" }]} />
      <h1 className="section-title mb-8">Contact Us</h1>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          {cards.map((c) => (
            <div key={c.t} className="flex items-center gap-4 rounded-2xl border border-line p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">{c.icon}</span>
              <div>
                <p className="font-heading text-lg font-bold">{c.t}</p>
                {c.href ? <a href={c.href} className="text-muted hover:text-brand-600">{c.v}</a> : <p className="text-muted">{c.v}</p>}
              </div>
            </div>
          ))}
          <SocialLinks s={s} btn="bg-brand-100 text-brand-700 hover:bg-brand-600 hover:text-white" />
          <p className="rounded-2xl bg-well p-5 text-sm text-muted">Questions about a medicine? Our pharmacists can advise you on dosage, interactions and alternatives.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <h2 className="bg-well px-6 py-4 font-heading text-xl font-bold">Send us a message</h2>
          <div className="p-6"><MessageForm /></div>
        </div>
      </div>
    </div>
  );
}
