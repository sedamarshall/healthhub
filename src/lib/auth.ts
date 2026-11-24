import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession, verifySession, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** remember=false gives a browser-session cookie (signed out when the browser closes). */
export async function setSession(s: Session, opts: { remember?: boolean } = {}) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(s), {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS-only on the live site; plain-http APP_URL (localhost / phone testing on Wi-Fi) still lets you sign in.
    secure: process.env.NODE_ENV === "production" && !(process.env.APP_URL ?? "").startsWith("http://"),
    path: "/",
    ...(opts.remember === false ? {} : { maxAge: 60 * 60 * 24 * 30 }),
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** For admin server actions/pages: throws a redirect unless the user is staff. */
export async function requireStaff(roles: Session["role"][] = ["admin", "pharmacist"]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/signin?next=/admin");
  if (!roles.includes(s.role)) redirect(s.role === "customer" ? "/signin?next=/admin" : "/admin");
  return s;
}
