/**
 * Seeds the delivery methods the old healthhub.ke site used (only if none exist yet).
 * Run: npx tsx scripts/seed-shipping.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  if (await prisma.shippingMethod.count()) return console.log("Shipping methods already set up. Nothing to do.");
  await prisma.shippingMethod.createMany({
    data: [
      { group: "Flat Rate", title: "Flat Shipping Rate", note: "Delivered to your door", fee: 250, freeOver: true, needsAddress: true, position: 1 },
      { group: "Pickup", title: "Pickup From Store", note: "Collect from our pharmacy", fee: 0, freeOver: false, needsAddress: false, position: 2 },
    ],
  });
  console.log("Added: Flat Shipping Rate (KES 250), Pickup From Store (KES 0)");
})().finally(() => prisma.$disconnect());
