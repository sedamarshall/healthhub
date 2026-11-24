import type { CSSProperties } from "react";

/**
 * Inline style for a pastel stat tile. Light mode uses the pastel as-is; dark mode
 * (theme-dark.css, `.tile-tint`) reads the solid colour from `--tile` to draw a dark card tinted with it.
 * Accepts "rgba(160,226,224,0.6)" or "rgb(...)" / hex.
 */
export function tileStyle(bg: string): CSSProperties {
  const solid = bg.replace(/rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,[^)]*\)/, "rgb($1, $2, $3)");
  return { background: bg, ["--tile" as string]: solid } as CSSProperties;
}
