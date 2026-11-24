import { prisma } from "@/lib/db";
import { saveTag } from "../actions-more";
import { FInput, ModuleHeader, Section } from "../ui/kit";
import { ActionForm, SaveButtons } from "../ui/kit-client";

export async function TagEditor({ id }: { id?: number }) {
  const tag = id ? await prisma.tag.findUnique({ where: { id } }) : null;
  return (
    <ActionForm action={saveTag}>
      {tag && <input type="hidden" name="id" value={tag.id} />}
      <ModuleHeader title={tag ? "Edit Tag" : "Create New Tag"} back="/admin/tags" />
      <Section title="Basic Information">
        <FInput label="Tag Name" name="name" required defaultValue={tag?.name} />
        <p className="mt-3 text-xs text-[#919eab]">Add tags to products from the product form. Tags help shoppers find products in search.</p>
      </Section>
      <SaveButtons cancel="/admin/tags" />
    </ActionForm>
  );
}
