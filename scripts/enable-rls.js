const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tables = [
    "User",
    "Room",
    "Customer",
    "Stay",
    "AccompanyingGuest",
    "BillItem",
    "Payment",
    "Expense",
    "AuditLog",
    "ServiceItem",
  ];

  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`RLS enabled for ${t}`);
    } catch (e) {
      console.error(`Error for ${t}:`, e.message);
    }
  }

  const roomCount = await prisma.room.count();
  console.log("Verified Prisma read query succeeds after RLS:", roomCount, "rooms found.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
