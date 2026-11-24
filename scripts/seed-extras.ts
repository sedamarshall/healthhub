/** One-off: create Brand rows from product brands, and default content pages + settings. Safe to re-run. */
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/utils";
const prisma = new PrismaClient();
(async () => {
  const brands = await prisma.product.findMany({ where: { brand: { not: null } }, distinct: ["brand"], select: { brand: true } });
  for (const b of brands) {
    const name = b.brand!.trim();
    if (!name) continue;
    await prisma.brand.upsert({ where: { name }, create: { name, slug: slugify(name) }, update: {} });
  }
  if ((await prisma.page.count()) === 0) {
    const faq = [
      ["How long does delivery take?", "Orders in Nairobi are usually delivered the same day if placed before 3pm. Other major towns take 1–2 days and the rest of Kenya 2–4 days."],
      ["How do I pay?", "You can pay with M-Pesa (you'll get a prompt on your phone) or with a Visa or Mastercard card."],
      ["How do I buy prescription medicine?", "Add it to your cart and upload a clear photo or PDF of a valid prescription at checkout. A pharmacist reviews it and you pay only after it's approved."],
      ["Can I return a product?", "Unopened products in their original packaging can be returned within 7 days. Medicines cannot be returned once they leave the pharmacy, for safety reasons."],
    ];
    for (const [i, [q, a]] of faq.entries()) await prisma.page.create({ data: { kind: "faq", title: q, content: `<p>${a}</p>`, position: i } });
    await prisma.page.create({ data: { kind: "privacy", title: "Privacy Policy", content: "<p>Health Hub Chemist collects only the information needed to process your orders, including your name, phone number, delivery address and, for prescription medicines, your prescription. Prescriptions are stored privately and are only seen by our pharmacists. We do not sell your data. Contact us to access or delete your data, as provided by the Kenya Data Protection Act, 2019.</p>" } });
    await prisma.page.create({ data: { kind: "terms", title: "Terms & Conditions", content: "<p>By ordering from Health Hub Chemist you confirm that the information you provide is accurate. Prescription-only medicines are dispensed only against a valid prescription approved by our pharmacist. Prices are in Kenya Shillings and include VAT where applicable.</p>" } });
  }
  console.log(`brands: ${await prisma.brand.count()}, pages: ${await prisma.page.count()}`);
  await prisma.$disconnect();
})();
