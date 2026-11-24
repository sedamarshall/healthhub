import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

/** Curved-line background, drawn here (our own artwork) in the reference sign-in style. */
function Waves() {
  const lines = Array.from({ length: 28 }, (_, i) => i);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1.2">
        {lines.map((i) => (
          <path key={`a${i}`} d={`M-100 ${120 + i * 14} C 300 ${-60 + i * 22}, 520 ${520 - i * 8}, 900 ${260 + i * 10} S 1400 ${40 + i * 18}, 1560 ${180 + i * 12}`} />
        ))}
        {lines.map((i) => (
          <path key={`b${i}`} d={`M-120 ${900 - i * 12} C 260 ${700 - i * 20}, 600 ${980 - i * 6}, 980 ${760 - i * 14} S 1380 ${560 + i * 6}, 1580 ${820 - i * 10}`} />
        ))}
      </g>
    </svg>
  );
}

/** Admin sign-in, laid out like the reference dashboard's /signin page. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session && session.role !== "customer") redirect(next?.startsWith("/admin") ? next : "/admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-900 p-5 lg:p-10">
      <Waves />
      <div className="relative mx-auto w-full max-w-[672px] rounded-3xl bg-white p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] lg:p-10">
        <div className="mb-8 flex flex-col items-start">
          <Link href="/" className="logo-chip mb-8" aria-label="Health Hub Chemist home">
            <Image src="/brand/logo.png" alt="Health Hub Chemist" width={140} height={40} priority className="h-10 w-auto" />
          </Link>
          <div className="relative mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/auth.svg" alt="" width={112} height={112} className="h-28 w-28 object-contain" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-ink">Welcome Back</h1>
          <p className="text-sm text-muted">Log in with your email and password to access the admin panel.</p>
        </div>
        <SignInForm next={next?.startsWith("/admin") ? next : "/admin"} />
        <p className="mt-10 text-sm text-muted">
          Shopping with us?
          <Link href="/login" className="ml-2 font-bold text-brand-600 hover:text-brand-700">Customer sign in</Link>
        </p>
      </div>
    </div>
  );
}
