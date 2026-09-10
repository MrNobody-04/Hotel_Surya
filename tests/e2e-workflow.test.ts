import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../src/lib/db";
import { checkIn, addBillItem, addPayment, checkOut, getStayById } from "../src/server/services/stay.service";
import { updateRoom } from "../src/server/services/room.service";

describe("Critical Hotel Surya End-to-End Operational Workflow", () => {
  let testUser: any;
  let testRoom: any;
  let customer: any;
  let activeStay: any;

  beforeAll(async () => {
    // Find or create test owner user
    testUser = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: "Test Admin",
          email: "testadmin@hotelsurya.com",
          passwordHash: "dummyhash",
          role: "OWNER",
        },
      });
    }

    // Ensure Room 102 (AC) is available
    testRoom = await prisma.room.findUnique({ where: { roomNumber: "102" } });
    if (!testRoom) {
      testRoom = await prisma.room.create({
        data: { roomNumber: "102", type: "AC", status: "AVAILABLE" },
      });
    } else {
      await prisma.room.update({
        where: { id: testRoom.id },
        data: { status: "AVAILABLE" },
      });
    }

    // Clean any prior stays on 102
    await prisma.stay.deleteMany({ where: { roomId: testRoom.id } });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it("Step 1: Creates a new customer with optional accompanying guest info", async () => {
    customer = await prisma.customer.create({
      data: {
        fullName: "Bikash Shrestha",
        gender: "MALE",
        citizenshipNumber: "14-02-76-99999",
        contactNumber: "9800000000",
        address: "Butwal-4, Rupandehi",
        notes: "Test guest for E2E flow",
      },
    });

    expect(customer.id).toBeDefined();
    expect(customer.fullName).toBe("Bikash Shrestha");
  });

  it("Step 2: Performs check-in to AC room with negotiated price NPR 5,000 and 2 people", async () => {
    const expectedCheckout = new Date(Date.now() + 24 * 60 * 60 * 1000);

    activeStay = await checkIn({
      customerId: customer.id,
      roomId: testRoom.id,
      numberOfPeople: 2,
      expectedCheckoutDate: expectedCheckout,
      roomPrice: 5000, // Negotiated price
      accompanyingGuests: [
        { fullName: "Sabina Shrestha", gender: "FEMALE" },
      ],
      prepayment: {
        amount: 5000,
        method: "CASH",
        notes: "Initial room prepayment",
      },
      userId: testUser.id,
      userName: testUser.name,
    });

    expect(activeStay.id).toBeDefined();
    expect(activeStay.roomPrice).toBe(5000);
    expect(activeStay.numberOfPeople).toBe(2);
    expect(activeStay.status).toBe("ACTIVE");
    expect(activeStay.checkInAt).toBeInstanceOf(Date);

    // Verify room is now OCCUPIED
    const updatedRoom = await prisma.room.findUnique({ where: { id: testRoom.id } });
    expect(updatedRoom?.status).toBe("OCCUPIED");
  });

  it("Step 3: Prevents double booking on the now occupied room", async () => {
    await expect(
      checkIn({
        customerId: customer.id,
        roomId: testRoom.id,
        numberOfPeople: 1,
        expectedCheckoutDate: new Date(),
        roomPrice: 4000,
        userId: testUser.id,
        userName: testUser.name,
      })
    ).rejects.toThrow(/not available/);
  });

  it("Step 4: Prevents putting an occupied room into maintenance", async () => {
    await expect(
      updateRoom(testRoom.id, { status: "MAINTENANCE" })
    ).rejects.toThrow(/Cannot set an occupied room into maintenance/);
  });

  it("Step 5: Guest orders Food (NPR 500) and Drinks (NPR 300) to unified live bill", async () => {
    // Add Food
    const foodItem = await addBillItem({
      stayId: activeStay.id,
      category: "FOOD",
      name: "Special Veg Khaja Set",
      quantity: 1,
      unitPrice: 500,
      userId: testUser.id,
      userName: testUser.name,
    });
    expect(foodItem.total).toBe(500);

    // Add Drinks
    const drinkItem = await addBillItem({
      stayId: activeStay.id,
      category: "DRINK",
      name: "Fresh Juice & Tea",
      quantity: 2,
      unitPrice: 150,
      userId: testUser.id,
      userName: testUser.name,
    });
    expect(drinkItem.total).toBe(300);

    // Verify stay bill: Room (5000) + Food (500) + Drinks (300) = 5800, Paid = 5000, Balance = 800
    const currentStay = await getStayById(activeStay.id);
    expect(currentStay?.billCalculation?.totalAmount).toBe(5800);
    expect(currentStay?.billCalculation?.paidAmount).toBe(5000);
    expect(currentStay?.billCalculation?.outstandingBalance).toBe(800);
    expect(currentStay?.billCalculation?.isFullyPaid).toBe(false);
  });

  it("Step 6: Prevents normal checkout with unpaid balance of NPR 800", async () => {
    await expect(
      checkOut({
        stayId: activeStay.id,
        userId: testUser.id,
        userName: testUser.name,
        userRole: "RECEPTIONIST",
      })
    ).rejects.toThrow(/Cannot checkout with outstanding balance of NPR 800/);
  });

  it("Step 7: Collects remaining NPR 800 and successfully completes checkout", async () => {
    // Receptionist collects NPR 800 via QR_PAYMENT during checkout
    const checkoutResult = await checkOut({
      stayId: activeStay.id,
      finalPayment: {
        amount: 800,
        method: "QR_PAYMENT",
        notes: "Remaining balance paid via Fonepay QR",
      },
      userId: testUser.id,
      userName: testUser.name,
      userRole: "RECEPTIONIST",
    });

    expect(checkoutResult.success).toBe(true);
    expect(checkoutResult.bill.outstandingBalance).toBe(0);
    expect(checkoutResult.bill.totalAmount).toBe(5800);
    expect(checkoutResult.bill.paidAmount).toBe(5800);
    expect(checkoutResult.checkoutAt).toBeDefined();

    // Verify Room 102 automatically becomes AVAILABLE again!
    const freedRoom = await prisma.room.findUnique({ where: { id: testRoom.id } });
    expect(freedRoom?.status).toBe("AVAILABLE");

    // Verify Stay status is CHECKED_OUT
    const finishedStay = await prisma.stay.findUnique({ where: { id: activeStay.id } });
    expect(finishedStay?.status).toBe("CHECKED_OUT");
    expect(finishedStay?.checkoutAt).toBeInstanceOf(Date);
  });

  it("Step 8: Prevents double checkout on an already checked out stay", async () => {
    await expect(
      checkOut({
        stayId: activeStay.id,
        userId: testUser.id,
        userName: testUser.name,
        userRole: "RECEPTIONIST",
      })
    ).rejects.toThrow(/Double checkout prevented/);
  });
});
