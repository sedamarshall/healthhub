import { HugeiconsIcon } from "@hugeicons/react";
import { Facebook01Icon, InstagramIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import type { Settings } from "@/lib/settings";

/** wa.me link for a Kenyan number written any way (+254 7.., 07.., 2547..). */
export function waLink(number: string, text?: string) {
  let d = number.replace(/\D/g, "");
  if (d.startsWith("0")) d = "254" + d.slice(1);
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** WhatsApp / Facebook / Instagram round buttons (only the ones set in Admin → Settings). */
export function SocialLinks({ s, className = "", btn = "" }: { s: Settings; className?: string; btn?: string }) {
  const items = [
    s.whatsapp && { href: waLink(s.whatsapp), label: "Chat with us on WhatsApp", icon: WhatsappIcon },
    s.facebookUrl && { href: s.facebookUrl, label: "Health Hub on Facebook", icon: Facebook01Icon },
    s.instagramUrl && { href: s.instagramUrl, label: "Health Hub on Instagram", icon: InstagramIcon },
  ].filter(Boolean) as { href: string; label: string; icon: typeof WhatsappIcon }[];
  if (!items.length) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {items.map((i) => (
        <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" aria-label={i.label} title={i.label} className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${btn}`}>
          <HugeiconsIcon icon={i.icon} size={18} />
        </a>
      ))}
    </div>
  );
}
