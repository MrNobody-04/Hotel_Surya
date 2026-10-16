const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking all public tables in PostgreSQL...");

  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC;
  `);

  console.log("Current status of tables in public schema:");
  for (const t of tables) {
    console.log(`  - ${t.tablename}: RLS = ${t.rowsecurity ? "ENABLED" : "DISABLED"}`);
  }

  const disabledTables = tables.filter((t) => !t.rowsecurity);
  console.log(`\nFound ${disabledTables.length} tables with RLS disabled.`);

  for (const t of disabledTables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t.tablename}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  ✓ RLS enabled for public."${t.tablename}"`);
    } catch (e) {
      console.error(`  ✗ Error enabling RLS for "${t.tablename}":`, e.message);
    }
  }

  console.log("\nVerifying all tables after update:");
  const verifiedTables = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC;
  `);

  let allSecure = true;
  for (const t of verifiedTables) {
    console.log(`  - ${t.tablename}: RLS = ${t.rowsecurity ? "ENABLED" : "DISABLED"}`);
    if (!t.rowsecurity) allSecure = false;
  }

  if (allSecure) {
    console.log("\n🎉 ALL public tables now have Row Level Security (RLS) ENABLED!");
  } else {
    console.warn("\n⚠️ Some tables still have RLS disabled.");
  }

  // Quick sanity check with Prisma
  const userCount = await prisma.user.count();
  const roomCount = await prisma.room.count();
  const catCount = await prisma.menuCategory.count();
  const creditAccCount = await prisma.creditAccount.count();

  console.log(`\nPrisma verified read access: ${userCount} users, ${roomCount} rooms, ${catCount} menu categories, ${creditAccCount} credit accounts.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

