import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { STORE } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import "./globals.css";
import "./theme-dark.css";
import { themeBootScript } from "@/components/ThemeToggle";

// Figtree is the single typeface for the whole system (shop + admin).
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", weight: ["400", "500", "600", "700", "800"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(STORE.appUrl),
    title: { default: s.seoTitle, template: `%s | ${s.storeName}` },
    description: s.seoDescription,
    icons: { icon: "/brand/favicon.png", apple: "/brand/favicon.png" },
    ...(s.googleVerification ? { verification: { google: s.googleVerification } } : {}),
  };
}

export const viewport: Viewport = { themeColor: "#a10fe4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" className={figtree.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
