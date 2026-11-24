/**
 * Create or update a staff account.
 *   npm run db:seed-admin -- admin@example.com "Strong password" admin
 *   npm run db:seed-admin -- pharmacist@example.com "Strong password" pharmacist
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const [email, password, role = "admin"] = process.argv.slice(2);

async function main() {
  if (!email || !password || password.length < 8 || !["admin", "pharmacist"].includes(role)) {
    console.error('Usage: npm run db:seed-admin -- <email> "<password, 8+ chars>" [admin|pharmacist]');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name: role === "admin" ? "Administrator" : "Pharmacist", passwordHash, role },
    update: { passwordHash, role },
  });
  console.log(`${user.role} account ready: ${user.email}`);
}

main().finally(() => prisma.$disconnect());
