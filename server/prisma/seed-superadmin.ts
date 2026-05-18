/**
 * Run once to seed the SuperAdmin account for local testing.
 *
 *   npx tsx server/prisma/seed-superadmin.ts
 *
 * SuperAdmin accounts are provisioned directly — there is no public sign-up flow.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: "server/.env" });

const prisma = new PrismaClient();

async function main() {
  const email = "smit@microskill.ai";
  const password = "smit@123";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isVerified: true },
    create: {
      email,
      name: "Smit",
      passwordHash,
      userType: "SUPERADMIN",
      isVerified: true,
      tenantId: null,
    },
  });

  console.log(`✓ SuperAdmin ready: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
