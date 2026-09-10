const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting Clean Slate: Removing all demo entries for Hotel Surya handover...");

  // 1. Delete dependent financial and stay records
  const delBillItems = await prisma.billItem.deleteMany({});
  console.log(`Deleted ${delBillItems.count} BillItem records.`);

  const delPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${delPayments.count} Payment records.`);

  const delGuests = await prisma.accompanyingGuest.deleteMany({});
  console.log(`Deleted ${delGuests.count} AccompanyingGuest records.`);

  const delStays = await prisma.stay.deleteMany({});
  console.log(`Deleted ${delStays.count} Stay records.`);

  const delCustomers = await prisma.customer.deleteMany({});
  console.log(`Deleted ${delCustomers.count} Customer records.`);

  const delExpenses = await prisma.expense.deleteMany({});
  console.log(`Deleted ${delExpenses.count} Expense records.`);

  const delAudit = await prisma.auditLog.deleteMany({});
  console.log(`Deleted ${delAudit.count} AuditLog records.`);

  // 2. Reset all 7 rooms to AVAILABLE
  const resetRooms = await prisma.room.updateMany({
    data: { status: "AVAILABLE" },
  });
  console.log(`Reset ${resetRooms.count} rooms to AVAILABLE.`);

  // 3. Verify user account
  const users = await prisma.user.findMany();
  console.log("Active accounts:", users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));

  // 4. Verify rooms
  const rooms = await prisma.room.findMany({ orderBy: { roomNumber: "asc" } });
  console.log("Current rooms (all must be AVAILABLE):", rooms.map(r => `${r.roomNumber} (${r.type}): ${r.status}`));

  console.log("✨ Clean Slate complete! Ready for live testing and handover.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
