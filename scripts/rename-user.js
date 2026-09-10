const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.update({
    where: { email: "gcsujan321@gmail.com" },
    data: { name: "Krishna Gc" },
  });
  console.log("Updated user name in Supabase:", updated.name, "(" + updated.email + ")");
}

main().finally(async () => {
  await prisma.$disconnect();
});
