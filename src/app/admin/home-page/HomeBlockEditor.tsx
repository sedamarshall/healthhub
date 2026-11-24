import { prisma } from "@/lib/db";
import { saveHomeBlock } from "../actions-more";
import { ACTIVE_OPTIONS, FDate, FInput, FSelect, FTextarea, ModuleHeader, Section, StatusPill } from "../ui/kit";
import { ActionForm, SaveButtons, UploadBox } from "../ui/kit-client";

const local = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

/** Add / edit a home page block, in the reference "Add New Block" layout. */
export async function HomeBlockEditor({ id }: { id?: number }) {
  const b = id ? await prisma.homeBlock.findUnique({ where: { id } }) : null;
  return (
    <ActionForm action={saveHomeBlock}>
      {b && <input type="hidden" name="id" value={b.id} />}
      <ModuleHeader title={b ? "Edit Block" : "Add New Block"} back="/admin/home-page">
        <StatusPill name="isActive" defaultValue={b && !b.isActive ? "off" : "on"} options={ACTIVE_OPTIONS} />
      </ModuleHeader>

      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <FInput label="Block Name" name="name" required defaultValue={b?.name} />
          <FSelect label="Type" name="type" defaultValue={b?.type ?? "hero"}>
            <option value="hero">Hero slider (top of home page)</option>
            <option value="promo">Promo banner (three across)</option>
          </FSelect>
          <FInput label="Slug (optional, made from the name)" name="slug" defaultValue={b?.slug} />
        </div>
      </Section>

      <Section title="Banner Content">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Title" name="title" required maxLength={120} defaultValue={b?.title} className="sm:col-span-2" />
          <FTextarea label="Text (optional)" name="text" rows={2} maxLength={240} defaultValue={b?.text} className="sm:col-span-2" />
          <FInput label="Small line above the title (hero only)" name="tag" maxLength={60} defaultValue={b?.tag} />
          <FInput label="Badge, e.g. New in (hero only)" name="badge" maxLength={30} defaultValue={b?.badge} />
          <FInput label="Button label" name="ctaLabel" maxLength={30} defaultValue={b?.ctaLabel ?? "Shop Now"} />
          <FInput label="Button link, e.g. /c/skin-care" name="href" required defaultValue={b?.href ?? "/search"} />
        </div>
      </Section>

      <Section title="Banner Image">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_260px] sm:gap-6">
          <div className="text-sm text-[#495057]">
            <p>Use a clear product or lifestyle photo. PNG or WEBP with a white or transparent background looks best.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#919eab]">
              <li>Hero slider: square image, about 800 × 800 px, shown in a white circle.</li>
              <li>Promo banner: about 600 × 600 px, shown on the right of the card.</li>
            </ul>
            {b?.image && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" name="removeImage" value="1" className="h-4 w-4 accent-[#a10fe4]" /> Remove the current image
              </label>
            )}
          </div>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b?.image && <img src={b.image} alt="" className="mb-3 h-32 w-full rounded-xl bg-[#f9fafb] object-contain" />}
            <UploadBox name="image" title={b?.image ? "Replace image" : "Upload banner image"} />
          </div>
        </div>
      </Section>

      <Section title="Display">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Order (lower shows first)" name="position" type="number" min={0} defaultValue={b?.position} />
          <FInput label="Background colour (promo), e.g. #ffe9d6" name="bgColor" pattern="#[0-9a-fA-F]{6}" defaultValue={b?.bgColor ?? "#ffe9d6"} />
          <FDate label="Show from (optional)" name="startsAt" defaultValue={local(b?.startsAt)} />
          <FDate label="Show until (optional)" name="endsAt" defaultValue={local(b?.endsAt)} />
        </div>
      </Section>
      <SaveButtons cancel="/admin/home-page" />
    </ActionForm>
  );
}
