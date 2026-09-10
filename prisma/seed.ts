import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Hotel Surya database seed...");

  // 1. Seed Owner User
  const passwordHash = await bcrypt.hash("Suj@ngc123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "gcsujan321@gmail.com" },
    update: {
      passwordHash,
      role: "OWNER" as any,
      isActive: true,
      name: "Sujan GC",
    },
    create: {
      name: "Sujan GC",
      email: "gcsujan321@gmail.com",
      passwordHash,
      role: "OWNER" as any,
      isActive: true,
    },
  });

  console.log("✅ Seeded Owner User (Sujan GC)");

  // 2. Seed Initial 7 Rooms (2 AC, 5 Non-AC)
  const initialRooms = [
    { roomNumber: "101", type: "AC", status: "AVAILABLE", notes: "First floor, king bed, air conditioned" },
    { roomNumber: "102", type: "AC", status: "AVAILABLE", notes: "First floor, queen bed, air conditioned" },
    { roomNumber: "103", type: "NON_AC", status: "AVAILABLE", notes: "First floor, standard twin beds" },
    { roomNumber: "104", type: "NON_AC", status: "AVAILABLE", notes: "First floor, double bed, mountain view" },
    { roomNumber: "105", type: "NON_AC", status: "AVAILABLE", notes: "Second floor, double bed" },
    { roomNumber: "106", type: "NON_AC", status: "AVAILABLE", notes: "Second floor, twin beds" },
    { roomNumber: "107", type: "NON_AC", status: "AVAILABLE", notes: "Second floor, single bed" },
  ];

  const createdRooms: Record<string, any> = {};
  for (const r of initialRooms) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: { type: r.type as any, notes: r.notes },
      create: {
        roomNumber: r.roomNumber,
        type: r.type as any,
        status: r.status as any,
        notes: r.notes,
      },
    });
    createdRooms[r.roomNumber] = room;
  }
  console.log("✅ Seeded 7 Initial Rooms (101-102 AC, 103-107 Non-AC)");

  // 3. Seed Service Catalog Items
  const catalog = [
    // Food
    { name: "Steamed Veg Momo", category: "FOOD", defaultPrice: 180 },
    { name: "Chicken Steamed Momo", category: "FOOD", defaultPrice: 240 },
    { name: "Veg Chowmein", category: "FOOD", defaultPrice: 160 },
    { name: "Egg Chowmein", category: "FOOD", defaultPrice: 200 },
    { name: "Traditional Nepali Dal Bhat", category: "FOOD", defaultPrice: 350 },
    { name: "Chicken Fried Rice", category: "FOOD", defaultPrice: 220 },
    { name: "Aloo Sadeko & Peanuts", category: "FOOD", defaultPrice: 140 },
    // Drinks
    { name: "Mineral Water (1L)", category: "DRINK", defaultPrice: 35 },
    { name: "Coca Cola (500ml)", category: "DRINK", defaultPrice: 100 },
    { name: "Nepal Special Masala Milk Tea", category: "DRINK", defaultPrice: 50 },
    { name: "Filter Coffee", category: "DRINK", defaultPrice: 90 },
    { name: "Fresh Orange Juice", category: "DRINK", defaultPrice: 160 },
    // Services
    { name: "Laundry Service (Regular)", category: "SERVICE", defaultPrice: 300 },
    { name: "Extra Rollaway Bed", category: "SERVICE", defaultPrice: 800 },
    { name: "Room Service Charge", category: "SERVICE", defaultPrice: 100 },
    { name: "Airport Pick / Drop", category: "SERVICE", defaultPrice: 1500 },
    // Other
    { name: "Room Key Replacement / Damage", category: "OTHER", defaultPrice: 500 },
  ];

  for (const item of catalog) {
    await prisma.serviceItem.upsert({
      where: { name: item.name },
      update: { defaultPrice: item.defaultPrice, category: item.category as any },
      create: {
        name: item.name,
        category: item.category as any,
        defaultPrice: item.defaultPrice,
        isActive: true,
      },
    });
  }
  console.log("✅ Seeded Service & Food Catalog Items");

  // 4. Seed Demo Customers
  const customer1 = await prisma.customer.create({
    data: {
      fullName: "Sujan Gc",
      gender: "MALE" as any,
      citizenshipNumber: "27-01-75-04321",
      contactNumber: "9841234567",
      address: "Pokhara-8, Kaski, Nepal",
      notes: "Corporate frequent traveler",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      fullName: "Prajita Sharma",
      gender: "FEMALE" as any,
      citizenshipNumber: "12-02-73-09876",
      contactNumber: "9812345678",
      address: "Kathmandu-3, Maharajgunj",
      notes: "VIP guest, requested quiet room",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      fullName: "Michael Anderson",
      gender: "OTHER" as any,
      contactNumber: "+14155552671",
      address: "San Francisco, CA, USA",
      notes: "Tourist on trekking trip",
    },
  });

  console.log("✅ Seeded Demo Customers");

  // 5. Seed an Active Stay (Room 101 - AC)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const stay1 = await prisma.stay.create({
    data: {
      customerId: customer1.id,
      roomId: createdRooms["101"].id,
      numberOfPeople: 2,
      expectedCheckoutDate: tomorrow,
      checkInAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      roomPrice: 4500, // Negotiated AC rate
      status: "ACTIVE" as any,
      notes: "Checked in around lunch time. Requested early morning tea.",
      createdById: owner.id,
    },
  });

  // Update room 101 status to OCCUPIED
  await prisma.room.update({
    where: { id: createdRooms["101"].id },
    data: { status: "OCCUPIED" as any },
  });

  // Accompanying guest for Stay 1
  await prisma.accompanyingGuest.create({
    data: {
      stayId: stay1.id,
      fullName: "Anupa Adhikari",
      gender: "FEMALE" as any,
    },
  });

  // Bill items for Stay 1
  await prisma.billItem.createMany({
    data: [
      {
        stayId: stay1.id,
        category: "FOOD" as any,
        name: "Chicken Steamed Momo",
        quantity: 2,
        unitPrice: 240,
        total: 480,
        createdById: owner.id,
      },
      {
        stayId: stay1.id,
        category: "DRINK" as any,
        name: "Coca Cola (500ml)",
        quantity: 2,
        unitPrice: 100,
        total: 200,
        createdById: owner.id,
      },
    ],
  });

  // Partial Payment for Stay 1 (Cash prepayment)
  await prisma.payment.create({
    data: {
      stayId: stay1.id,
      amount: 4500,
      method: "CASH" as any,
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      notes: "Advance room prepayment in Cash",
      recordedById: owner.id,
    },
  });

  console.log("✅ Seeded Active Stay in Room 101 with Bill items & Prepayment");

  // 6. Seed a Past Completed Stay (Room 104 - Non-AC)
  const pastCheckIn = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const pastCheckOut = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const stay2 = await prisma.stay.create({
    data: {
      customerId: customer2.id,
      roomId: createdRooms["104"].id,
      numberOfPeople: 1,
      expectedCheckoutDate: pastCheckOut,
      checkInAt: pastCheckIn,
      checkoutAt: pastCheckOut,
      roomPrice: 2200,
      status: "CHECKED_OUT" as any,
      notes: "Stay completed smoothly",
      createdById: owner.id,
    },
  });

  await prisma.billItem.createMany({
    data: [
      {
        stayId: stay2.id,
        category: "FOOD" as any,
        name: "Traditional Nepali Dal Bhat",
        quantity: 1,
        unitPrice: 350,
        total: 350,
        createdById: owner.id,
      },
      {
        stayId: stay2.id,
        category: "DRINK" as any,
        name: "Nepal Special Masala Milk Tea",
        quantity: 2,
        unitPrice: 50,
        total: 100,
        createdById: owner.id,
      },
    ],
  });

  // Payments for stay 2 (Total: 2200 + 350 + 100 = 2650)
  await prisma.payment.createMany({
    data: [
      {
        stayId: stay2.id,
        amount: 2200,
        method: "QR_PAYMENT" as any,
        timestamp: pastCheckIn,
        notes: "Fonepay QR Room Payment",
        recordedById: owner.id,
      },
      {
        stayId: stay2.id,
        amount: 450,
        method: "CASH" as any,
        timestamp: pastCheckOut,
        notes: "Cash payment at checkout for F&B",
        recordedById: owner.id,
      },
    ],
  });

  // 7. Seed Operational Expenses
  await prisma.expense.createMany({
    data: [
      {
        title: "Staff monthly salary disbursement",
        amount: 45000,
        category: "SALARY" as any,
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        paymentMethod: "BANK_TRANSFER" as any,
        notes: "Salary for reception and housekeeping staff",
        createdById: owner.id,
      },
      {
        title: "Fresh vegetables and dairy for kitchen",
        amount: 6200,
        category: "FOOD_PURCHASE" as any,
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        paymentMethod: "CASH" as any,
        notes: "Weekly kitchen vegetables and groceries",
        createdById: owner.id,
      },
      {
        title: "Nepal Electricity Authority (NEA) Bill",
        amount: 14500,
        category: "ELECTRICITY" as any,
        date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        paymentMethod: "QR_PAYMENT" as any,
        notes: "Monthly hotel electricity bill",
        createdById: owner.id,
      },
      {
        title: "Subisu High-Speed Optical Fiber Internet",
        amount: 3200,
        category: "INTERNET" as any,
        date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        paymentMethod: "BANK_TRANSFER" as any,
        notes: "Commercial unlimited Wi-Fi plan",
        createdById: owner.id,
      },
    ],
  });

  // 8. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: owner.id,
        userName: owner.name,
        action: "LOGIN",
        entity: "Session",
        metadata: JSON.stringify({ ip: "127.0.0.1", userAgent: "Mozilla/5.0" }),
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        userId: owner.id,
        userName: owner.name,
        action: "CHECKIN_CREATED",
        entity: "Stay",
        entityId: stay1.id,
        metadata: JSON.stringify({ roomNumber: "101", guest: "Sujan Gc", roomPrice: 4500 }),
        timestamp: stay1.checkInAt,
      },
      {
        userId: owner.id,
        userName: owner.name,
        action: "CHECKOUT_COMPLETED",
        entity: "Stay",
        entityId: stay2.id,
        metadata: JSON.stringify({ roomNumber: "104", guest: "Prajita Sharma", totalPaid: 2650 }),
        timestamp: pastCheckOut,
      },
    ],
  });

  console.log("✅ Seed completed successfully for Hotel Surya! 🎉");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
