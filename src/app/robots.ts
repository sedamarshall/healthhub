import type { MetadataRoute } from "next";
import { STORE } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/cart", "/checkout", "/order/", "/api/"] }],
    sitemap: `${STORE.appUrl}/sitemap.xml`,
  };
}
