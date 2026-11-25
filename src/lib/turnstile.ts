import "server-only";

/**
 * Cloudflare Turnstile (free, privacy-friendly CAPTCHA). Off until both keys are set in .env:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY=...   (shown in the page)
 *   TURNSTILE_SECRET_KEY=...             (server only)
 * When off, every check passes, so the forms keep working in development.
 */
export const turnstileOn = () => !!(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);

export async function verifyTurnstile(form: FormData, ip?: string): Promise<boolean> {
  if (!turnstileOn()) return true;
  const token = String(form.get("cf-turnstile-response") ?? "");
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip && ip !== "local" ? { remoteip: ip } : {}) });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
