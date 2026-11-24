import Link from "next/link";
import { Breadcrumbs } from "@/components/Listing";

export default function NotFound() {
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "404" }]} />
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="font-heading text-[120px] font-bold leading-none text-brand-600">404</p>
        <h1 className="mt-6 font-heading text-4xl font-bold text-ink">Oops!</h1>
        <p className="mt-3 text-muted">Sorry, we couldn&apos;t find that page. The product may have moved or is no longer available. Try going back or checking out our homepage.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center rounded-full bg-brand-600 px-8 font-semibold text-white shadow-[0_6px_15px_rgba(161,15,228,0.16)] hover:bg-brand-700">Back To Home</Link>
          <Link href="/search" className="inline-flex h-12 items-center rounded-full border border-line px-8 font-semibold hover:border-brand-600 hover:text-brand-600">Browse products</Link>
        </div>
      </div>
    </div>
  );
}
