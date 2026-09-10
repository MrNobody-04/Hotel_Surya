const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Check if testadmin was created by e2e test
  const testUsers = await prisma.user.findMany({
    where: { email: "testadmin@hotelsurya.com" },
  });

  if (testUsers.length > 0) {
    const sujan = await prisma.user.findFirst({
      where: { email: "gcsujan321@gmail.com" },
    });

    if (sujan) {
      await prisma.stay.updateMany({
        where: { createdById: { in: testUsers.map((u) => u.id) } },
        data: { createdById: sujan.id },
      });
      await prisma.user.deleteMany({
        where: { email: "testadmin@hotelsurya.com" },
      });
    }
  }

  // Ensure 102 is AVAILABLE if it was used in test
  await prisma.room.updateMany({
    where: { roomNumber: "102" },
    data: { status: "AVAILABLE" },
  });

  const users = await prisma.user.findMany();
  console.log("Verified database users:", users.map((u) => ({ email: u.email, role: u.role, name: u.name })));
}

main().finally(async () => {
  await prisma.$disconnect();
});
