import { prisma } from "@/lib/db";
import { saveCoupon } from "../actions-more";
import { ACTIVE_OPTIONS, FDate, FInput, FSelect, ModuleHeader, Section, StatusPill } from "../ui/kit";
import { ActionForm, SaveButtons } from "../ui/kit-client";

const local = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export async function CouponEditor({ id }: { id?: number }) {
  const c = id ? await prisma.coupon.findUnique({ where: { id } }) : null;
  return (
    <ActionForm action={saveCoupon}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <ModuleHeader title={c ? "Edit Coupon" : "Create New Coupon"} back="/admin/coupons">
        <StatusPill name="isActive" defaultValue={c && !c.isActive ? "off" : "on"} options={ACTIVE_OPTIONS} />
      </ModuleHeader>
      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Title (e.g. Weekend Special)" name="title" required defaultValue={c?.title} />
          <FInput label="Code (customers type this)" name="code" required defaultValue={c?.code} className="[&_input]:uppercase" />
          <FSelect label="Discount type" name="type" defaultValue={c?.type ?? "percent"}>
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (KES)</option>
          </FSelect>
          <FInput label="Coupon Amount" name="value" type="number" min={1} required defaultValue={c?.value} />
          <FInput label="Minimum order (KES)" name="minOrder" type="number" min={0} defaultValue={c?.minOrder ?? 0} />
          <FInput label="Maximum discount (KES, optional)" name="maxDiscount" type="number" min={0} defaultValue={c?.maxDiscount ?? ""} />
          <FInput label="Usage limit (optional)" name="usageLimit" type="number" min={1} defaultValue={c?.usageLimit ?? ""} />
          <FDate label="Start Date" name="startsAt" defaultValue={local(c?.startsAt)} />
          <FDate label="End Date" name="endsAt" defaultValue={local(c?.endsAt)} />
        </div>
        {c && <p className="mt-4 text-xs text-[#919eab]">Used {c.used} time(s) on paid orders.</p>}
      </Section>
      <SaveButtons cancel="/admin/coupons" />
    </ActionForm>
  );
}
