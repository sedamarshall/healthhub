import { notFound } from "next/navigation";
import { ipaySimulated } from "@/lib/ipay";

export const dynamic = "force-dynamic";

// Development stand-in for iPay's payment page (only when IPAY_VENDOR_ID / IPAY_HASH_KEY are empty, never in production).
export default async function SimulateIpay({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (!ipaySimulated()) notFound();
  const { ref, amount } = await searchParams;
  const base = `/api/ipay/callback?ivm=${encodeURIComponent(ref ?? "")}`;
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-2xl border border-line p-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#b78103]">Development mode</p>
        <h1 className="mt-2 font-heading text-xl font-bold">iPay test page</h1>
        <p className="mt-2 text-sm text-muted">Add IPAY_VENDOR_ID and IPAY_HASH_KEY to .env to use the real iPay checkout (M-Pesa, Airtel Money, cards).</p>
        {amount && <p className="mt-4 text-2xl font-bold">KES {Number(amount).toLocaleString("en-KE")}</p>}
        <div className="mt-6 grid gap-2">
          <a className="btn-primary" href={`${base}&simulated=1`}>Simulate successful payment</a>
          <a className="btn-outline" href={`${base}&simulated=0`}>Simulate cancelled payment</a>
        </div>
      </div>
    </div>
  );
}
