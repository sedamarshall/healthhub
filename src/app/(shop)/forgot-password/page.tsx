import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Listing";
import { ForgotForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Forgot password" }]} />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-line">
        <h1 className="bg-well px-6 py-4 font-heading text-xl font-bold">Forgot your password?</h1>
        <div className="p-6 sm:p-8"><ForgotForm /></div>
      </div>
    </div>
  );
}
