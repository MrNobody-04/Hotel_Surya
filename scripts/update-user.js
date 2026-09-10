const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting user update for Hotel Surya...");

  const newEmail = "gcsujan321@gmail.com";
  const newPass = "Suj@ngc123";
  const passwordHash = await bcrypt.hash(newPass, 10);

  // 1. Create or update the Sujan GC account
  const sujanUser = await prisma.user.upsert({
    where: { email: newEmail },
    update: {
      passwordHash,
      role: "OWNER",
      isActive: true,
      name: "Sujan GC",
    },
    create: {
      name: "Sujan GC",
      email: newEmail,
      passwordHash,
      role: "OWNER",
      isActive: true,
    },
  });

  console.log(`Created/Updated Owner user: ${sujanUser.email} (ID: ${sujanUser.id})`);

  // 2. Find old demo users
  const demoEmails = [
    "owner@hotelsurya.com",
    "manager@hotelsurya.com",
    "reception@hotelsurya.com",
  ];

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: demoEmails } },
  });

  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length > 0) {
    console.log(`Found ${demoUserIds.length} demo users to migrate and remove.`);

    // Reassign relations to Sujan GC
    const updatedStays = await prisma.stay.updateMany({
      where: { createdById: { in: demoUserIds } },
      data: { createdById: sujanUser.id },
    });
    console.log(`Reassigned ${updatedStays.count} stays to Sujan GC.`);

    const updatedPayments = await prisma.payment.updateMany({
      where: { recordedById: { in: demoUserIds } },
      data: { recordedById: sujanUser.id },
    });
    console.log(`Reassigned ${updatedPayments.count} payments to Sujan GC.`);

    const updatedExpenses = await prisma.expense.updateMany({
      where: { createdById: { in: demoUserIds } },
      data: { createdById: sujanUser.id },
    });
    console.log(`Reassigned ${updatedExpenses.count} expenses to Sujan GC.`);

    const updatedBillItems = await prisma.billItem.updateMany({
      where: { createdById: { in: demoUserIds } },
      data: { createdById: sujanUser.id },
    });
    console.log(`Reassigned ${updatedBillItems.count} bill items to Sujan GC.`);

    const updatedAuditLogs = await prisma.auditLog.updateMany({
      where: { userId: { in: demoUserIds } },
      data: { userId: sujanUser.id },
    });
    console.log(`Reassigned ${updatedAuditLogs.count} audit logs to Sujan GC.`);

    // Now safely delete the demo users
    const deleted = await prisma.user.deleteMany({
      where: { id: { in: demoUserIds } },
    });
    console.log(`Deleted ${deleted.count} demo users.`);
  }

  // Verify remaining users
  const remainingUsers = await prisma.user.findMany();
  console.log("Remaining users in database:", remainingUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
  })));
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
