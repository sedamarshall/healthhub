import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";

/** Store settings editable in Admin → Settings. Values fall back to .env, then to these defaults. */
export const SETTING_DEFAULTS = {
  storeName: "Health Hub Chemist",
  phone: process.env.STORE_PHONE || "+254 704 191 509",
  email: "info@healthhub.ke",
  address: "Off Shangai Rd, Athi River, Nairobi",
  whatsapp: "+254 704 191 509",
  facebookUrl: "https://www.facebook.com/profile.php?id=61557605484864",
  instagramUrl: "https://www.instagram.com/healthhubke/",
  ppbLicence: process.env.PPB_LICENCE_NO || "",
  freeDeliveryOver: String(process.env.FREE_DELIVERY_OVER || 5000),
  seoTitle: "Health Hub Chemist | Online Pharmacy & Health Shop",
  seoDescription: "Genuine medicines, vitamins, baby care, skin care and health products delivered across Kenya. Pay with M-Pesa, Airtel Money or card.",
  googleVerification: "",
  ipayEnabled: "1",
  maintenance: "0",
  maintenanceMessage: "We're updating our store and will be back shortly. For urgent orders call us.",
  maintenanceUntil: "",
};
export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(
  unstable_cache(
    async (): Promise<Settings> => {
      const rows = await prisma.setting.findMany();
      const out = { ...SETTING_DEFAULTS } as Settings;
      for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
      return out;
    },
    ["settings"],
    { tags: ["settings"], revalidate: 3600 },
  ),
);

export async function saveSettings(values: Partial<Settings>) {
  const { revalidateTag } = await import("next/cache");
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value: String(value ?? "") }, update: { value: String(value ?? "") } }),
    ),
  );
  revalidateTag("settings");
}

/** Payment methods customers can actually use: switched on in settings AND configured (or dev simulation). */
/** Which online payment options checkout can offer. iPay covers M-Pesa, Airtel Money and cards. */
export async function paymentMethods() {
  const s = await getSettings();
  const keys = !!(process.env.IPAY_VENDOR_ID && process.env.IPAY_HASH_KEY);
  const dev = process.env.NODE_ENV !== "production";
  return { ipay: s.ipayEnabled === "1" && (keys || dev) };
}
