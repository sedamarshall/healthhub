import { saveProduct } from "../actions";
import { FInput, FSelect, FTextarea, ModuleHeader, Section, StatusPill, Toggle } from "../ui/kit";
import { ActionForm, SaveButtons, UploadBox } from "../ui/kit-client";
import { CategoryPicker } from "./CategoryPicker";
import { DiscountCard } from "./DiscountCard";
import { TagPicker } from "./TagPicker";

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
      <ModuleHeader title={values.id ? "Edit Product" : "Create Product"} back={back}>
        <StatusPill name="status" label="Visibility" defaultValue={values.status} options={[["active", "Publish"], ["draft", "Draft"], ["archived", "Archived"]]} />
      </ModuleHeader>

      <Section title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <FInput label="Product Name" name="name" required defaultValue={values.name} />
          <FInput label="Slug" name="slug" defaultValue={values.slug} />
          <CategoryPicker categories={categories} selected={values.categoryIds} />
          <FSelect label="Product Type" name="rxClass" defaultValue={values.rxClass}>
            <option value="otc">Over the counter</option>
            <option value="pom">Prescription-only (pharmacist approval)</option>
          </FSelect>
          <div>
            <FInput label="Brand" name="brand" list="brand-list" defaultValue={values.brand} />
            <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <FInput label="SKU (auto if empty)" name="sku" defaultValue={values.sku} />
          <FTextarea label="Description (HTML allowed: <p>, <ul>, <li>, <strong>)" name="descriptionHtml" rows={6} defaultValue={values.descriptionHtml} className="sm:col-span-2" />
        </div>
      </Section>

      <Section title="Media">
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadBox name="cover" title="Upload Cover photo" hint="Main photo on the shop. Allowed *.jpeg, *.jpg, *.png, *.webp · Max 5 MB" />
          <UploadBox name="images" title="Upload Product photos" hint="Extra photos for the gallery (pick several). Allowed *.jpeg, *.jpg, *.png, *.webp · Max 5 MB" multiple />
        </div>
        {values.id && <p className="mt-3 text-xs text-[#919eab]">A new cover photo goes first. Current photos can be reordered or removed below the form.</p>}
      </Section>

      <Section title="Pricing & Stock">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          <FInput label="Price (KES)" name="price" type="number" min={0} step={1} required defaultValue={values.price} />
          <FInput label="Stock Quantity" name="stockQty" type="number" min={0} step={1} defaultValue={values.stockQty} />
          <FSelect label="Availability" name="stockStatus" defaultValue={values.stockStatus}>
            <option value="in_stock">In stock</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="special_order">Special order (2–3 days)</option>
          </FSelect>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-6">
          <Toggle name="featured" defaultChecked={values.featured} label="Feature on home page" hint="Shows in Best Selling and the home banners" />
          <Toggle name="needsReview" defaultChecked={values.needsReview} label="Flag for review" hint="Lists it under products that need checking" />
        </div>
      </Section>

      <Section title="Tags">
        <TagPicker tags={tags} initial={values.tags} />
      </Section>

      <Section title="Discount">
        <DiscountCard price={values.salePrice} startsAt={values.saleStartsAt} endsAt={values.saleEndsAt} />
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
