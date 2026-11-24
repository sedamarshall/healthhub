import { prisma } from "@/lib/db";
import { saveBrand } from "../actions-more";
import { FInput, ModuleHeader, Section } from "../ui/kit";
import { ActionForm, SaveButtons, UploadBox } from "../ui/kit-client";

export async function BrandEditor({ id }: { id?: number }) {
  const brand = id ? await prisma.brand.findUnique({ where: { id } }) : null;
  return (
    <ActionForm action={saveBrand}>
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <ModuleHeader title={brand ? "Edit Brand" : "Create New Brand"} back="/admin/brands" />
      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_240px] sm:gap-6">
          <div>
            <FInput label="Brand Name" name="name" required defaultValue={brand?.name} />
            {brand && <p className="mt-3 text-xs text-[#919eab]">Renaming a brand also updates every product that uses it.</p>}
          </div>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {brand?.logo && <img src={brand.logo} alt="" className="mb-3 h-16 w-full rounded-xl bg-[#f9fafb] object-contain" />}
            <UploadBox name="logo" title={brand?.logo ? "Replace logo" : "Upload Brand logo"} />
          </div>
        </div>
      </Section>
      <SaveButtons cancel="/admin/brands" />
    </ActionForm>
  );
}
