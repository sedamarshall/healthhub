// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hh_session";
export type Session = { uid: number; role: "customer" | "pharmacist" | "admin"; name: string; email: string };

const key = () => {
  const secret = process.env.AUTH_SECRET;
  // On the live site a missing or placeholder secret would let anyone forge a login, so refuse to run.
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32 || secret.startsWith("change-me"))) {
    throw new Error("AUTH_SECRET is missing or too short. Set a random value of 32+ characters in .env.");
  }
  return new TextEncoder().encode(secret || "dev-only-secret-change-me");
};

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: Number(payload.uid), role: payload.role as Session["role"], name: String(payload.name), email: String(payload.email) };
  } catch {
    return null;
  }
}
