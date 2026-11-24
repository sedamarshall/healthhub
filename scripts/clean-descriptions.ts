/** Re-clean every product description from the original export with the current sanitiser. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { sanitizeHtml } from "../src/lib/sanitize";
import { htmlToText } from "../src/lib/utils";

const prisma = new PrismaClient();
(async () => {
  const raw = JSON.parse(readFileSync(join(__dirname, "../data/healthhub_products.json"), "utf8"));
  let n = 0;
  for (const p of raw.products) {
    const html = sanitizeHtml(String(p.description_html ?? ""));
    const r = await prisma.product.updateMany({ where: { legacyId: Number(p.product_id) }, data: { descriptionHtml: html, descriptionText: String(p.description_text ?? "") || htmlToText(html) } });
    n += r.count;
  }
  console.log(`cleaned ${n} descriptions`);
  await prisma.$disconnect();
})();
