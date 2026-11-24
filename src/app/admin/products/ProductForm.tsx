import { saveProduct } from "../actions";
import { FDate, FInput, FSelect, FTextarea, ModuleHeader, Section, StatusPill, Toggle } from "../ui/kit";
import { ActionForm, SaveButtons, UploadBox } from "../ui/kit-client";
import { CategoryPicker } from "./CategoryPicker";

export type ProductFormValues = {
  id?: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  price: number | "";
  salePrice: number | "";
  saleStartsAt: string;
  saleEndsAt: string;
  stockQty: number;
  stockStatus: string;
  rxClass: string;
  status: string;
  featured: boolean;
  needsReview: boolean;
  descriptionHtml: string;
  metaTitle: string;
  metaDescription: string;
  categoryIds: number[];
  tags: string;
};

/** Create / edit product, laid out like the reference "Create Product" page. */
export function ProductForm({
  values,
  categories,
  brands,
  tags,
}: {
  values: ProductFormValues;
  categories: { id: number; name: string; depth: number }[];
  brands: string[];
  tags: string[];
}) {
  const back = values.id ? `/admin/products/${values.id}` : "/admin/products";
  return (
    <ActionForm action={saveProduct}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <ModuleHeader title={values.id ? "Edit Product" : "Create New Product"} back={back}>
        <StatusPill name="status" label="Visibility" defaultValue={values.status} options={[["active", "Publish"], ["draft", "Draft"], ["archived", "Archived"]]} />
      </ModuleHeader>

      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Product Name" name="name" required defaultValue={values.name} />
          <FInput label="Slug" name="slug" defaultValue={values.slug} />
          <FSelect label="Product Type" name="rxClass" defaultValue={values.rxClass}>
            <option value="otc">Over the counter</option>
            <option value="pom">Prescription-only (pharmacist approval)</option>
          </FSelect>
          <div>
            <FInput label="Brand" name="brand" list="brand-list" defaultValue={values.brand} />
            <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <FInput label="SKU (auto if empty)" name="sku" defaultValue={values.sku} />
          <FSelect label="Availability" name="stockStatus" defaultValue={values.stockStatus}>
            <option value="in_stock">In stock</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="special_order">Special order (2–3 days)</option>
          </FSelect>
          <FTextarea label="Description (HTML allowed: <p>, <ul>, <li>, <strong>)" name="descriptionHtml" rows={7} defaultValue={values.descriptionHtml} className="sm:col-span-2" />
        </div>
      </Section>

      <Section title="Media">
        <div className="grid gap-4 sm:grid-cols-3">
          <UploadBox name="images" title="Upload Product photos" multiple />
        </div>
      </Section>

      <Section title="Pricing & Stock">
        <div className="grid gap-5 sm:grid-cols-3">
          <FInput label="Price (KES)" name="price" type="number" min={0} step={1} required defaultValue={values.price} />
          <FInput label="Stock Quantity" name="stockQty" type="number" min={0} step={1} defaultValue={values.stockQty} />
          <div className="flex flex-col justify-center gap-3">
            <Toggle name="featured" defaultChecked={values.featured} label="Feature on home page" />
            <Toggle name="needsReview" defaultChecked={values.needsReview} label="Flag for review" />
          </div>
        </div>
      </Section>

      <Section title="Categories">
        <CategoryPicker categories={categories} selected={values.categoryIds} />
      </Section>

      <Section title="Tags">
        <FInput label="Select Tags (comma separated)" name="tags" list="tag-list" defaultValue={values.tags} />
        <datalist id="tag-list">{tags.map((t) => <option key={t} value={t} />)}</datalist>
      </Section>

      <Section title="Discount">
        <div className="grid gap-5 rounded-2xl bg-[#f9fafb] p-4 sm:grid-cols-3">
          <FInput label="Discount Price (KES)" name="salePrice" type="number" min={0} step={1} defaultValue={values.salePrice} className="[&_label]:bg-[#f9fafb]" />
          <FDate label="Discount Starts" name="saleStartsAt" defaultValue={values.saleStartsAt} />
          <FDate label="Discount Ends" name="saleEndsAt" defaultValue={values.saleEndsAt} />
        </div>
        <p className="mt-2 text-xs text-[#919eab]">Leave the dates empty for a discount that runs until you remove it.</p>
      </Section>

      <Section title="SEO">
        <div className="grid gap-5">
          <FInput label="Meta Title" name="metaTitle" defaultValue={values.metaTitle} />
          <FTextarea label="Meta Description" name="metaDescription" rows={3} maxLength={320} defaultValue={values.metaDescription} />
        </div>
      </Section>

      <SaveButtons cancel={back} />
    </ActionForm>
  );
}
