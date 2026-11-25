import "server-only";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, sessionSeconds, signSession, verifySession, type Session } from "./session";

/** bcrypt cost for new and changed passwords (11 ≈ 0.25 s in bcryptjs: slow for attackers, fine for people). */
export const BCRYPT_COST = 11;
export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);
/** True when a stored hash uses a weaker cost than today's and should be re-hashed after a successful login. */
export const needsRehash = (hash: string) => Number(hash.split("$")[2]) < BCRYPT_COST;

// Compared against when the email doesn't exist, so a login takes the same time either way
// (otherwise the response time would reveal which emails have accounts).
const DUMMY_HASH = "$2b$11$jRq4VfGfREwLvbGp.qpUR.iPBqbN2459TrVQTxHHzhYwIaSWap88u";
export async function checkPassword(pw: string, hash: string | null | undefined) {
  if (!hash) {
    await bcrypt.compare(pw, DUMMY_HASH).catch(() => false);
    return false;
  }
  return bcrypt.compare(pw, hash);
}

/**
 * The signed-in user, re-checked against the database on every request: a deactivated account, a changed
 * role or a bumped sessionVersion (password change, "sign out everywhere") ends the session immediately,
 * even though the cookie itself is still valid. Cached per request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await prisma.user.findUnique({ where: { id: s.uid }, select: { name: true, email: true, role: true, isActive: true, sessionVersion: true } });
  if (!u || !u.isActive || u.role !== s.role || u.sessionVersion !== (s.sv ?? 0)) return null;
  return { ...s, name: u.name, email: u.email };
});

/** remember=false gives a browser-session cookie (signed out when the browser closes). */
export async function setSession(s: Session, opts: { remember?: boolean } = {}) {
  const jar = await cookies();
  const u = await prisma.user.findUnique({ where: { id: s.uid }, select: { sessionVersion: true } });
  jar.set(SESSION_COOKIE, await signSession({ ...s, sv: u?.sessionVersion ?? 0 }), {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS-only on the live site; plain-http APP_URL (localhost / phone testing on Wi-Fi) still lets you sign in.
    secure: process.env.NODE_ENV === "production" && !(process.env.APP_URL ?? "").startsWith("http://"),
    path: "/",
    ...(opts.remember === false ? {} : { maxAge: sessionSeconds(s.role) }),
  });
}

/** Signs the user out on every device (their existing cookies stop working). */
export async function endAllSessions(uid: number) {
  await prisma.user.update({ where: { id: uid }, data: { sessionVersion: { increment: 1 } } });
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
