import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { effectivePrice, kes } from "@/lib/utils";
import { ModuleHeader, Section, fmtDate } from "../../ui/kit";

export const metadata = { title: "Cart details" };

export default async function CartDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["admin"]);
  const cart = await prisma.cart.findUnique({
    where: { id: (await params).id },
    include: { user: true, items: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } },
  });
  if (!cart) notFound();
  const total = cart.items.reduce((a, i) => a + effectivePrice(i.product) * i.qty, 0);
  return (
    <div className="space-y-6">
      <ModuleHeader title={`Cart #${cart.id.slice(-6).toUpperCase()}`} back="/admin/abandoned-carts" />
      <Section title="Shopper">
        {cart.user ? (
          <p className="text-sm">
            <Link href={`/admin/customers/${cart.user.id}`} className="font-medium text-[#a10fe4]">{cart.user.name}</Link> · {cart.user.email}
            {cart.user.phone && <> · <a href={`tel:+${cart.user.phone}`} className="text-[#a10fe4]">0{cart.user.phone.slice(3)}</a></>}
          </p>
        ) : (
          <p className="text-sm text-[#495057]">Guest shopper (not signed in), so there are no contact details.</p>
        )}
        <p className="mt-1 text-xs text-[#919eab]">Created {fmtDate(cart.createdAt)} · last updated {cart.updatedAt.toLocaleString("en-KE")}</p>
      </Section>
      <Section title="Items">
        <ul className="divide-y divide-[rgba(145,158,171,0.2)] text-sm">
          {cart.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.product.images[0] && <img src={i.product.images[0].url} alt="" className="h-10 w-10 rounded-lg bg-[#f9fafb] object-contain" />}
              <Link href={`/admin/products/${i.product.id}`} className="flex-1 hover:text-[#a10fe4]">{i.product.name}</Link>
              <span className="text-[#495057]">{kes(effectivePrice(i.product))} × {i.qty}</span>
              <span className="w-24 text-right font-semibold">{kes(effectivePrice(i.product) * i.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-[rgba(145,158,171,0.2)] pt-3 text-right text-base font-bold">Total {kes(total)}</p>
      </Section>
    </div>
  );
}
