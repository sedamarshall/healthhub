"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { markPaymentPaid, restockOrder } from "@/lib/orders";
import { notifyOrder } from "@/lib/notify";
import { deleteUploaded, saveProductImage } from "@/lib/uploads";
import { htmlToText, slugify } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

export type FormState = { error?: string; ok?: string };

// ---------------- Products ----------------

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  slug: z.string().trim().max(100).optional(),
  sku: z.string().trim().max(40).optional(),
  brand: z.string().trim().max(80).optional(),
  price: z.coerce.number().int("Price must be a whole number").min(0),
  salePrice: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),
  stockQty: z.coerce.number().int().min(0).max(100000),
  stockStatus: z.enum(["in_stock", "out_of_stock", "special_order"]),
  rxClass: z.enum(["otc", "pom"]),
  status: z.enum(["active", "draft", "archived"]),
  descriptionHtml: z.string().max(50000).optional(),
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  saleStartsAt: z.string().optional(),
  saleEndsAt: z.string().optional(),
});

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireStaff(["admin"]);
  const id = Number(form.get("id")) || null;
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: `${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}` };
  const d = parsed.data;
  if (d.status === "active" && d.price <= 0) return { error: "Set a price above 0 before making the product active" };

  const slug = slugify(d.slug || d.name);
  const clash = await prisma.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { error: `Another product already uses the URL /p/${slug}. Change the slug.` };
  if (d.sku) {
    const skuClash = await prisma.product.findFirst({ where: { sku: d.sku, NOT: id ? { id } : undefined } });
    if (skuClash) return { error: `SKU ${d.sku} is already used by "${skuClash.name}"` };
  }

  const descriptionHtml = sanitizeHtml(d.descriptionHtml ?? "");
  const salePrice = d.salePrice === "" || d.salePrice === undefined || d.salePrice === 0 ? null : d.salePrice;
  if (salePrice !== null && salePrice >= d.price) return { error: "Sale price must be lower than the regular price" };

  const toDate = (v?: string) => (v ? new Date(v) : null);
  const saleStartsAt = salePrice !== null ? toDate(d.saleStartsAt) : null;
  const saleEndsAt = salePrice !== null ? toDate(d.saleEndsAt) : null;
  if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) return { error: "The discount must end after it starts" };
  if (d.brand) await prisma.brand.upsert({ where: { name: d.brand }, create: { name: d.brand, slug: slugify(d.brand) }, update: {} });

  const data = {
    name: d.name,
    slug,
    brand: d.brand || null,
    price: d.price,
    salePrice,
    saleStartsAt,
    saleEndsAt,
    stockQty: d.stockQty,
    stockStatus: d.stockStatus,
    rxClass: d.rxClass,
    status: d.status,
    featured: form.get("featured") === "on",
    needsReview: form.get("needsReview") === "on",
    descriptionHtml,
    descriptionText: htmlToText(descriptionHtml),
    metaTitle: d.metaTitle || null,
    metaDescription: d.metaDescription || htmlToText(descriptionHtml).slice(0, 155) || null,
  };

  // Upload new images first so a bad file doesn't leave a half-saved product
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  let urls: string[] = [];
  try {
    urls = await Promise.all(files.map(saveProductImage));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed" };
  }

  const categoryIds = form.getAll("categoryIds").map(Number).filter(Boolean);
  let productId: number;
  if (id) {
    const before = await prisma.product.findUnique({ where: { id } });
    if (!before) return { error: "Product not found" };
    await prisma.product.update({ where: { id }, data: { ...data, ...(d.sku ? { sku: d.sku } : {}) } });
    if (before.stockQty !== d.stockQty) {
      await prisma.stockMovement.create({ data: { productId: id, delta: d.stockQty - before.stockQty, reason: "adjustment", userEmail: s.email } });
    }
    productId = id;
  } else {
    const created = await prisma.product.create({ data: { ...data, sku: d.sku || `TMP-${Date.now()}` } });
    if (!d.sku) await prisma.product.update({ where: { id: created.id }, data: { sku: `HHN${String(created.id).padStart(5, "0")}` } });
    if (d.stockQty > 0) await prisma.stockMovement.create({ data: { productId: created.id, delta: d.stockQty, reason: "restock", userEmail: s.email } });
    productId = created.id;
  }

  await prisma.productCategory.deleteMany({ where: { productId } });
  if (categoryIds.length) await prisma.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId, categoryId })) });

  // Tags: comma-separated names, created on the fly
  const tagNames = [...new Set(String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  await prisma.productTag.deleteMany({ where: { productId } });
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({ where: { name }, create: { name, slug: slugify(name) }, update: {} });
    await prisma.productTag.create({ data: { productId, tagId: tag.id } });
  }

  if (urls.length) {
    const last = await prisma.productImage.aggregate({ where: { productId }, _max: { position: true } });
    const start = (last._max.position ?? -1) + 1;
    await prisma.productImage.createMany({ data: urls.map((url, i) => ({ productId, url, alt: d.name, position: start + i })) });
  }

  revalidatePath("/", "layout");
  revalidateTag("catalog");
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  redirect(`/admin/products/${productId}?saved=1`);
  return { ok: "Saved" };
}

export async function deleteProductImage(imageId: number) {
  await requireStaff(["admin"]);
  const img = await prisma.productImage.delete({ where: { id: imageId } });
  await deleteUploaded(img.url);
  revalidatePath("/admin", "layout");
  revalidateTag("catalog");
}

export async function makePrimaryImage(imageId: number) {
  await requireStaff(["admin"]);
  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img) return;
  const all = await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: { position: "asc" } });
  const ordered = [img, ...all.filter((i) => i.id !== img.id)];
  await prisma.$transaction(ordered.map((i, n) => prisma.productImage.update({ where: { id: i.id }, data: { position: n } })));
  revalidatePath("/admin", "layout");
  revalidateTag("catalog");
}

export async function bulkProducts(form: FormData) {
  await requireStaff(["admin"]);
  const ids = form.getAll("ids").map(Number).filter(Boolean);
  const action = String(form.get("action"));
  const updates: Record<string, object> = {
    activate: { status: "active" },
    draft: { status: "draft" },
    archive: { status: "archived" },
    rx: { rxClass: "pom" },
    otc: { rxClass: "otc" },
    feature: { featured: true },
    unfeature: { featured: false },
    reviewed: { needsReview: false, reviewNote: null },
  };
  if (ids.length && updates[action]) {
    const where = action === "activate" ? { id: { in: ids }, price: { gt: 0 } } : { id: { in: ids } };
    await prisma.product.updateMany({ where, data: updates[action] });
  }
  revalidatePath("/", "layout");
  revalidateTag("catalog");
}

export async function setStock(form: FormData) {
  const s = await requireStaff(["admin"]);
  const id = Number(form.get("id"));
  const qty = Math.max(0, Math.floor(Number(form.get("qty"))));
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || Number.isNaN(qty)) return;
  const stockStatus = qty > 0 && product.stockStatus === "out_of_stock" ? "in_stock" : qty === 0 && product.stockStatus === "in_stock" ? "out_of_stock" : product.stockStatus;
  await prisma.product.update({ where: { id }, data: { stockQty: qty, stockStatus } });
  if (qty !== product.stockQty) {
    await prisma.stockMovement.create({ data: { productId: id, delta: qty - product.stockQty, reason: qty > product.stockQty ? "restock" : "adjustment", userEmail: s.email } });
  }
  revalidatePath("/admin", "layout");
  revalidateTag("catalog");
}

// ---------------- Categories ----------------

export async function saveCategory(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff(["admin"]);
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  const parentId = Number(form.get("parentId")) || null;
  if (name.length < 2) return { error: "Name is required" };
  if (id && parentId === id) return { error: "A category can't be its own parent" };
  let slug = slugify(String(form.get("slug") || name));
  if (await prisma.category.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) slug = `${slug}-${Date.now().toString().slice(-4)}`;
  const data = { name, slug, parentId, isActive: form.get("isActive") === "on", position: Number(form.get("position")) || 0 };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/", "layout");
  revalidateTag("catalog");
  redirect("/admin/categories");
}

export async function deleteCategory(form: FormData) {
  await requireStaff(["admin"]);
  const id = Number(form.get("id"));
  const c = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { children: true, products: true } } } });
  if (!c || c._count.children > 0 || c._count.products > 0) return; // only empty leaf categories can be deleted
  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidateTag("catalog");
}

// ---------------- Orders & prescriptions ----------------

/** Which statuses an order can move to from where it is now. Payment moves it to Processing by itself. */
const NEXT: Record<string, string[]> = {
  awaiting_rx: ["cancelled"],
  pending_payment: ["cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  paid: ["processing", "shipped", "delivered", "cancelled"],
  shipped: ["delivered", "processing", "cancelled"],
  delivered: [],
  cancelled: [],
};
export async function nextStatuses(status: string) {
  return NEXT[status] ?? [];
}

export async function updateOrderStatus(form: FormData) {
  const s = await requireStaff();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.status === status || !(NEXT[order.status] ?? []).includes(status)) return;
  if (status === "cancelled") await restockOrder(id, s.email);
  await prisma.order.update({ where: { id }, data: { status } });
  if (status === "shipped" || status === "delivered" || status === "cancelled") notifyOrder(id, status);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin", "layout");
}

/** Payment taken by phone, M-Pesa till or cash: records it and moves the order to Processing. */
export async function markOrderPaid(form: FormData) {
  const s = await requireStaff();
  const id = Number(form.get("id"));
  const receipt = String(form.get("receipt") ?? "").trim().slice(0, 60) || null;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.paymentStatus === "paid" || order.status !== "pending_payment") return;
  const reference = `${order.number}-MANUAL-${Date.now().toString(36).toUpperCase()}`;
  await prisma.payment.create({ data: { orderId: id, provider: "manual", amount: order.total, reference, phone: order.phone, message: `Marked paid by ${s.email}` } });
  await markPaymentPaid(reference, { amount: order.total, receipt, message: `Recorded manually by ${s.email}` });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin", "layout");
}

export async function reviewPrescription(form: FormData) {
  const s = await requireStaff();
  const orderId = Number(form.get("orderId"));
  const decision = String(form.get("decision"));
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  if (!["approved", "rejected"].includes(decision)) return;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.rxStatus !== "pending") return;
  await prisma.$transaction([
    prisma.prescription.updateMany({ where: { orderId }, data: { status: decision, reviewedBy: s.email, reviewedAt: new Date(), note } }),
    prisma.order.update({
      where: { id: orderId },
      data: { rxStatus: decision, rxNote: note, status: decision === "approved" ? "pending_payment" : "cancelled" },
    }),
  ]);
  notifyOrder(orderId, decision === "approved" ? "rx_approved" : "rx_rejected", { note: note ?? undefined });
  revalidatePath("/admin", "layout");
  revalidateTag("catalog");
}

// ---------------- Users ----------------

export async function setUserRole(form: FormData) {
  const s = await requireStaff(["admin"]);
  const id = Number(form.get("id"));
  const role = String(form.get("role"));
  if (!["customer", "pharmacist", "admin"].includes(role) || id === s.uid) return; // can't change your own role
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
  revalidatePath("/admin/customers");
}


/** Delete a product. Products that appear in orders are archived instead, to keep order history intact. */
export async function deleteProduct(form: FormData) {
  await requireStaff(["admin"]);
  const id = Number(form.get("id"));
  const used = await prisma.orderItem.count({ where: { productId: id } });
  if (used) await prisma.product.update({ where: { id }, data: { status: "archived", featured: false } });
  else {
    const imgs = await prisma.productImage.findMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    for (const i of imgs) await deleteUploaded(i.url);
  }
  revalidatePath("/", "layout");
  revalidateTag("catalog");
}

export async function setProductStatus(form: FormData) {
  await requireStaff(["admin"]);
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!["active", "draft", "archived"].includes(status)) return;
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p || (status === "active" && p.price <= 0)) return;
  await prisma.product.update({ where: { id }, data: { status } });
  revalidatePath("/", "layout");
  revalidateTag("catalog");
}
