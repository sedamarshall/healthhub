import { prisma } from "@/lib/db";
import { saveFlashSale } from "../actions-more";
import { ACTIVE_OPTIONS, FDate, FInput, ModuleHeader, Section, StatusPill } from "../ui/kit";
import { ActionForm, SaveButtons } from "../ui/kit-client";
import { ProductPicker } from "../ui/ProductPicker";

const local = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export async function FlashEditor({ id }: { id?: number }) {
  const f = id ? await prisma.flashSale.findUnique({ where: { id }, include: { products: { select: { id: true, sku: true, name: true, price: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } } } }) : null;
  return (
    <ActionForm action={saveFlashSale}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <ModuleHeader title={f ? "Edit Flash Sales" : "Create New Flash Sales"} back="/admin/flash-sales">
        <StatusPill name="isActive" defaultValue={f && !f.isActive ? "off" : "on"} options={ACTIVE_OPTIONS} />
      </ModuleHeader>
      <Section title="Basic Information">
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <FInput label="Title" name="title" required defaultValue={f?.title} />
            <FInput label="Discount (%)" name="discountPct" type="number" min={1} max={90} required defaultValue={f?.discountPct} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <FDate label="Start Date" name="startsAt" required defaultValue={local(f?.startsAt)} />
            <FDate label="End Date" name="endsAt" required defaultValue={local(f?.endsAt)} />
          </div>
        </div>
      </Section>
      <Section title="Add Product for Discount">
        <ProductPicker name="skus" initial={(f?.products ?? []).map((p) => ({ sku: p.sku, name: p.name, price: p.price, image: p.images[0]?.url ?? null }))} />
      </Section>
      <SaveButtons cancel="/admin/flash-sales" />
    </ActionForm>
  );
}
