import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";

export const SHIPPING_TAG = "shipping";

/** A delivery option as checkout uses it. `id` is a string so it can go straight into a form field. */
export type ShipOption = { id: string; group: string; title: string; note: string; fee: number; freeOver: boolean; needsAddress: boolean };

/** Active delivery methods in display order (cached; admin changes clear the cache). */
export const getShippingOptions = cache(
  unstable_cache(
    async (): Promise<ShipOption[]> => {
      const rows = await prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: [{ position: "asc" }, { id: "asc" }] });
      return rows.map((m) => ({ id: String(m.id), group: m.group, title: m.title, note: m.note, fee: m.fee, freeOver: m.freeOver, needsAddress: m.needsAddress }));
    },
    ["shipping-options"],
    { tags: [SHIPPING_TAG], revalidate: 3600 },
  ),
);

/** Fee for one option: free when it allows free delivery and the order (after discount) reaches the threshold. */
export function shippingFee(o: Pick<ShipOption, "fee" | "freeOver">, subtotal: number, freeDeliveryOver: number): number {
  if (o.fee > 0 && o.freeOver && freeDeliveryOver > 0 && subtotal >= freeDeliveryOver) return 0;
  return o.fee;
}
