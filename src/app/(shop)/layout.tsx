import { Suspense } from "react";
import { Header, Logo } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { Reveal } from "@/components/Reveal";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [s, session] = await Promise.all([getSettings(), getSession()]);

  // Maintenance mode: customers see a notice; signed-in staff can still browse.
  if (s.maintenance === "1" && !(session && session.role !== "customer")) {
    const until = s.maintenanceUntil ? new Date(s.maintenanceUntil) : null;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-well px-6 text-center">
        <Logo />
        <h1 className="mt-8 font-heading text-3xl font-bold">We&apos;ll be back soon</h1>
        <p className="mt-3 max-w-md text-muted">{s.maintenanceMessage}</p>
        {until && !isNaN(until.getTime()) && <p className="mt-2 text-sm text-muted">Expected back: {until.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>}
        <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="btn-primary mt-6">Call {s.phone}</a>
      </main>
    );
  }

  return (
    <>
      {/* Turn on scroll-reveal before first paint so cards don't flash then hide. */}
      <script dangerouslySetInnerHTML={{ __html: "if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reveal-on')" }} />
      <Reveal />
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <Suspense><BottomNav signedIn={!!session} /></Suspense>
    </>
  );
}
