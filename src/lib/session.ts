// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hh_session";
/** sv = the user's sessionVersion when signed in; bumping it in the database signs them out everywhere. */
export type Session = { uid: number; role: "customer" | "pharmacist" | "admin"; name: string; email: string; sv?: number };

/** Staff sessions are short (a stolen admin cookie is worth more); customers stay signed in for 30 days. */
export const sessionSeconds = (role: Session["role"]) => (role === "customer" ? 60 * 60 * 24 * 30 : 60 * 60 * 12);

const key = () => {
  const secret = process.env.AUTH_SECRET;
  // On the live site a missing or placeholder secret would let anyone forge a login, so refuse to run.
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32 || secret.startsWith("change-me"))) {
    throw new Error("AUTH_SECRET is missing or too short. Set a random value of 32+ characters in .env.");
  }
  return new TextEncoder().encode(secret || "dev-only-secret-change-me");
};

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${sessionSeconds(s.role)}s`).sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: Number(payload.uid), role: payload.role as Session["role"], name: String(payload.name), email: String(payload.email), sv: Number(payload.sv ?? 0) };
  } catch {
    return null;
  }
}
