import { prisma } from "@/lib/db";
import { saveCategory } from "../actions";
import { categoryTree } from "../products/categoryTree";
import { FInput, FSelect, ModuleHeader, Section, StatusPill } from "../ui/kit";
import { ActionForm, SaveButtons } from "../ui/kit-client";

export async function CategoryEditor({ id }: { id?: number }) {
  const [tree, cat] = await Promise.all([categoryTree(), id ? prisma.category.findUnique({ where: { id } }) : null]);
  return (
    <ActionForm action={saveCategory}>
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <ModuleHeader title={cat ? "Edit Category" : "Create New Category"} back="/admin/categories">
        <StatusPill name="isActive" defaultValue={cat && !cat.isActive ? "off" : "on"} options={[["on", "Active"], ["off", "Hidden"]]} />
      </ModuleHeader>
      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Category Name" name="name" required defaultValue={cat?.name} />
          <FInput label="Slug (auto if empty)" name="slug" defaultValue={cat?.slug} />
          <FSelect label="Parent Category" name="parentId" defaultValue={cat?.parentId ?? ""}>
            <option value="">(top level)</option>
            {tree.filter((c) => c.id !== cat?.id).map((c) => <option key={c.id} value={c.id}>{"— ".repeat(c.depth)}{c.name}</option>)}
          </FSelect>
          <FInput label="Sort Order" name="position" type="number" defaultValue={cat?.position ?? 0} />
        </div>
      </Section>
      <SaveButtons cancel="/admin/categories" />
    </ActionForm>
  );
}
