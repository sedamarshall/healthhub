import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Listing";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Create Account" }]} />
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-line">
        <h1 className="bg-well px-6 py-4 font-heading text-xl font-bold">Create your account</h1>
        <div className="p-6 sm:p-8">
        <RegisterForm next={next} />
        </div>
      </div>
    </div>
  );
}
