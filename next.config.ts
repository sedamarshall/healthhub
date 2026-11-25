import type { NextConfig } from "next";

/**
 * Content-Security-Policy: where the browser may load scripts, frames, etc. from, and where forms may post.
 * - Scripts only from this site (+ Cloudflare Turnstile). 'unsafe-inline' is needed for Next.js' inline
 *   page-data scripts and the dark-mode boot script; everything else (frames, plugins, <base>, other sites
 *   embedding us) is locked down.
 * - form-action allows iPay's hosted payment page.
 * - Dev mode needs 'unsafe-eval' for hot reload.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "form-action 'self' https://payments.ipayafrica.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
  },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" }, // microphone: voice search
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  async rewrites() {
    return [
      // Old OpenCart URLs (index.php?route=...) are answered by a 301 handler.
      { source: "/index.php", destination: "/api/legacy" },
      { source: "/image/:path*", destination: "/api/legacy-image/:path*" },
    ];
  },
};

export default nextConfig;
