const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const prisma = new PrismaClient();

async function main() {
  console.log("Creating PaymentQr table if not exists in database...");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PaymentQr" (
      "id" TEXT PRIMARY KEY,
      "bankName" TEXT NOT NULL,
      "accountName" TEXT NOT NULL,
      "accountNumber" TEXT NOT NULL,
      "qrImageUrl" TEXT NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Ensuring indexes on PaymentQr...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PaymentQr_isDefault_idx" ON "PaymentQr"("isDefault");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PaymentQr_isActive_idx" ON "PaymentQr"("isActive");
  `);

  console.log("Enabling Row Level Security for PaymentQr...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "PaymentQr" ENABLE ROW LEVEL SECURITY;`);
  } catch (err) {
    console.log("RLS notice:", err.message);
  }

  console.log("Seeding default Nabil Bank QR if table is empty...");
  const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "PaymentQr"`);
  const existingCount = Number(count[0]?.count || 0);

  if (existingCount === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PaymentQr" ("id", "bankName", "accountName", "accountNumber", "qrImageUrl", "isDefault", "isActive", "notes")
      VALUES (
        'default-nabil-qr',
        'Nabil Bank',
        'SUJAN G.C.',
        '27710017501941',
        '/images/nabil-qr.jpg',
        true,
        true,
        'Works with Fonepay, Nabil Smart, eSewa, Khalti, IME Pay & all Nepali banking apps.'
      )
      ON CONFLICT ("id") DO NOTHING;
    `);
    console.log("Default Nabil Bank QR seeded.");
  } else {
    console.log(`PaymentQr table already has ${existingCount} record(s).`);
  }

  console.log("Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Prisma client regenerated successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
