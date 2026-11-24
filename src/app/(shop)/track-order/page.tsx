import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Listing";
import { TrackOrderForm } from "@/components/TrackOrderForm";

export const metadata: Metadata = { title: "Order Tracking" };

export default function TrackOrderPage() {
  return (
    <div className="container-x py-4 sm:py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Order Tracking" }]} />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-line">
        <h1 className="bg-well px-6 py-4 font-heading text-xl font-bold">My Orders: track an order</h1>
        <TrackOrderForm />
        <p className="border-t border-line px-6 py-4 text-center text-sm text-muted sm:px-8">
          Have an account? <a href="/login?next=%2Faccount%3Ftab%3Dorders" className="font-semibold text-brand-600">Log in</a> to see all your orders.
        </p>
      </div>
    </div>
  );
}
