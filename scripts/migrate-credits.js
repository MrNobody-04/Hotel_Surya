const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Checking database connection...");
  const customerCount = await prisma.customer.count();
  console.log(`Connection verified. Found ${customerCount} existing customers.`);

  console.log("Executing non-destructive DDL for Credit Management tables...");

  const ddlStatements = [
    // 1. Enums (with IF NOT EXISTS handling)
    `DO $$ BEGIN
      CREATE TYPE "CreditAccountStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "CreditBillStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "CreditLedgerType" AS ENUM ('CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REFUND');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;`,

    // 2. CreditAccount table
    `CREATE TABLE IF NOT EXISTS "CreditAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerId" TEXT NOT NULL UNIQUE,
      "status" "CreditAccountStatus" NOT NULL DEFAULT 'PAID',
      "creditLimit" DOUBLE PRECISION,
      "totalCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CreditAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "CreditAccount_customerId_idx" ON "CreditAccount"("customerId");`,
    `CREATE INDEX IF NOT EXISTS "CreditAccount_status_idx" ON "CreditAccount"("status");`,
    `CREATE INDEX IF NOT EXISTS "CreditAccount_currentBalance_idx" ON "CreditAccount"("currentBalance");`,

    // 3. CreditBill table
    `CREATE TABLE IF NOT EXISTS "CreditBill" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "billNumber" TEXT NOT NULL UNIQUE,
      "accountId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "status" "CreditBillStatus" NOT NULL DEFAULT 'PENDING',
      "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "dueDate" TIMESTAMP(3),
      "notes" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CreditBill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CreditBill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "CreditBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "CreditBill_accountId_idx" ON "CreditBill"("accountId");`,
    `CREATE INDEX IF NOT EXISTS "CreditBill_customerId_idx" ON "CreditBill"("customerId");`,
    `CREATE INDEX IF NOT EXISTS "CreditBill_status_idx" ON "CreditBill"("status");`,
    `CREATE INDEX IF NOT EXISTS "CreditBill_createdAt_idx" ON "CreditBill"("createdAt");`,
    `CREATE INDEX IF NOT EXISTS "CreditBill_dueDate_idx" ON "CreditBill"("dueDate");`,

    // 4. CreditBillItem table
    `CREATE TABLE IF NOT EXISTS "CreditBillItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "billId" TEXT NOT NULL,
      "serviceItemId" TEXT,
      "name" TEXT NOT NULL,
      "category" TEXT,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPrice" DOUBLE PRECISION NOT NULL,
      "total" DOUBLE PRECISION NOT NULL,
      "originalPrice" DOUBLE PRECISION,
      "isCustom" BOOLEAN NOT NULL DEFAULT false,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CreditBillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CreditBill"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CreditBillItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "CreditBillItem_billId_idx" ON "CreditBillItem"("billId");`,
    `CREATE INDEX IF NOT EXISTS "CreditBillItem_serviceItemId_idx" ON "CreditBillItem"("serviceItemId");`,

    // 5. CreditPayment table
    `CREATE TABLE IF NOT EXISTS "CreditPayment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "receiptNumber" TEXT NOT NULL UNIQUE,
      "accountId" TEXT NOT NULL,
      "billId" TEXT,
      "amount" DOUBLE PRECISION NOT NULL,
      "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
      "previousBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "remainingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "referenceNumber" TEXT,
      "idempotencyKey" TEXT UNIQUE,
      "recordedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CreditPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CreditPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CreditBill"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "CreditPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "CreditPayment_accountId_idx" ON "CreditPayment"("accountId");`,
    `CREATE INDEX IF NOT EXISTS "CreditPayment_billId_idx" ON "CreditPayment"("billId");`,
    `CREATE INDEX IF NOT EXISTS "CreditPayment_createdAt_idx" ON "CreditPayment"("createdAt");`,
    `CREATE INDEX IF NOT EXISTS "CreditPayment_paymentMethod_idx" ON "CreditPayment"("paymentMethod");`,

    // 6. CreditLedgerEntry table
    `CREATE TABLE IF NOT EXISTS "CreditLedgerEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "type" "CreditLedgerType" NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "runningBalance" DOUBLE PRECISION NOT NULL,
      "description" TEXT NOT NULL,
      "referenceId" TEXT,
      "referenceNumber" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CreditLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CreditLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_accountId_idx" ON "CreditLedgerEntry"("accountId");`,
    `CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_type_idx" ON "CreditLedgerEntry"("type");`,
    `CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_createdAt_idx" ON "CreditLedgerEntry"("createdAt");`,

    // 7. CreditAdjustment table
    `CREATE TABLE IF NOT EXISTS "CreditAdjustment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "billId" TEXT,
      "amount" DOUBLE PRECISION NOT NULL,
      "reason" TEXT NOT NULL,
      "oldTotal" DOUBLE PRECISION NOT NULL,
      "newTotal" DOUBLE PRECISION NOT NULL,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CreditAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CreditAdjustment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CreditBill"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "CreditAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "CreditAdjustment_accountId_idx" ON "CreditAdjustment"("accountId");`,
    `CREATE INDEX IF NOT EXISTS "CreditAdjustment_billId_idx" ON "CreditAdjustment"("billId");`,
    `CREATE INDEX IF NOT EXISTS "CreditAdjustment_createdAt_idx" ON "CreditAdjustment"("createdAt");`,
  ];

  for (let i = 0; i < ddlStatements.length; i++) {
    const stmt = ddlStatements[i];
    await prisma.$executeRawUnsafe(stmt);
  }

  console.log("All Credit Management tables and indexes successfully created in PostgreSQL!");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
