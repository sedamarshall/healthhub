import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Listing";
import { ResetForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Reset password" }]} />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-line">
        <h1 className="bg-well px-6 py-4 font-heading text-xl font-bold">Choose a new password</h1>
        <div className="p-6 sm:p-8">
          {token ? <ResetForm token={token} /> : <p className="text-muted">This link is missing its token. <Link href="/forgot-password" className="font-semibold text-brand-600">Request a new link</Link>.</p>}
        </div>
      </div>
    </div>
  );
}
