import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";

export type HomeBlockView = {
  id: number; type: string; tag: string; badge: string; title: string; text: string;
  ctaLabel: string; href: string; image: string | null; bgColor: string;
  startsAt: string | null; endsAt: string | null;
};

const load = unstable_cache(
  async (): Promise<HomeBlockView[]> => {
    const rows = await prisma.homeBlock.findMany({ where: { isActive: true }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    return rows.map((b) => ({
      id: b.id, type: b.type, tag: b.tag, badge: b.badge, title: b.title, text: b.text, ctaLabel: b.ctaLabel, href: b.href,
      image: b.image, bgColor: b.bgColor, startsAt: b.startsAt?.toISOString() ?? null, endsAt: b.endsAt?.toISOString() ?? null,
    }));
  },
  ["home-blocks"],
  { tags: ["home-blocks"], revalidate: 300 },
);

/** Active home page blocks (Admin → Home Page Control) that are inside their show-from / show-until window now. */
export const getHomeBlocks = cache(async () => {
  const now = Date.now();
  const live = (await load()).filter((b) => (!b.startsAt || Date.parse(b.startsAt) <= now) && (!b.endsAt || Date.parse(b.endsAt) > now));
  return { hero: live.filter((b) => b.type === "hero"), promo: live.filter((b) => b.type === "promo") };
});
