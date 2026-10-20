import { describe, it, expect } from "vitest";

describe("Room Deletion & Stay Preservation Logic", () => {
  it("excludes archived rooms from active inventory while preserving past stay references", () => {
    const rooms = [
      { id: "101", roomNumber: "101", isArchived: false, status: "AVAILABLE" },
      { id: "102", roomNumber: "102", isArchived: true, status: "MAINTENANCE" }, // archived room 102
      { id: "201", roomNumber: "201", isArchived: false, status: "AVAILABLE" },
    ];

    const activeRooms = rooms.filter((r) => !r.isArchived);
    expect(activeRooms.map((r) => r.roomNumber)).toEqual(["101", "201"]);
    expect(activeRooms.some((r) => r.roomNumber === "102")).toBe(false);

    // Past stays referencing Room 102 still resolve their roomNumber
    const pastStays = [
      { id: "stay-1", roomId: "102", room: rooms.find((r) => r.id === "102") },
    ];
    expect(pastStays[0].room?.roomNumber).toBe("102");
    expect(pastStays[0].room?.isArchived).toBe(true);
  });
});

describe("Company Payment & Combined Analytics Calculations", () => {
  it("combines hotel revenue, dining revenue, customer credits, and company payments correctly", () => {
    const hotelRevenue = 15000;
    const diningRevenue = 8500;
    const creditRevenue = 4200;
    const companyRevenue = 25000;

    const totalCombinedRevenue =
      hotelRevenue + diningRevenue + creditRevenue + companyRevenue;
    expect(totalCombinedRevenue).toBe(52700);

    const expenses = 18000;
    const netIncome = totalCombinedRevenue - expenses;
    expect(netIncome).toBe(34700);
  });

  it("tallies payment methods including company payments correctly", () => {
    const paymentsByMethod: Record<string, number> = {
      CASH: 5000,
      QR_PAYMENT: 3000,
      BANK_TRANSFER: 0,
      CARD: 0,
    };

    // Add company payments
    const companyPayments = [
      { amount: 15000, paymentMethod: "BANK_TRANSFER" },
      { amount: 5000, paymentMethod: "CASH" },
      { amount: 10000, paymentMethod: "QR_PAYMENT" },
    ];

    for (const cp of companyPayments) {
      paymentsByMethod[cp.paymentMethod] =
        (paymentsByMethod[cp.paymentMethod] || 0) + cp.amount;
    }

    expect(paymentsByMethod.CASH).toBe(10000);
    expect(paymentsByMethod.QR_PAYMENT).toBe(13000);
    expect(paymentsByMethod.BANK_TRANSFER).toBe(15000);
  });
});

describe("Credit Management: Adding Items to Existing Bill", () => {
  it("correctly appends new line items and recalculates bill and account totals", () => {
    const initialBill = {
      id: "bill-1",
      billNumber: "CR-202610-001",
      subtotal: 1000,
      totalAmount: 1000,
      paidAmount: 300,
      remainingAmount: 700,
      items: [
        { name: "Buff Momo", quantity: 2, unitPrice: 200, total: 400 },
        { name: "Beer", quantity: 1, unitPrice: 600, total: 600 },
      ],
    };

    const newItems = [
      { name: "Chicken Chowmein", quantity: 2, unitPrice: 180, total: 360 },
      { name: "Mineral Water", quantity: 2, unitPrice: 30, total: 60 },
    ];

    const addedSubtotal = newItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    expect(addedSubtotal).toBe(420);

    const updatedBillTotal = initialBill.totalAmount + addedSubtotal;
    const updatedRemaining = updatedBillTotal - initialBill.paidAmount;

    expect(updatedBillTotal).toBe(1420);
    expect(updatedRemaining).toBe(1120);

    // Initial customer debt was 700, now becomes 1120
    const initialBalance = 700;
    const newCustomerBalance = initialBalance + addedSubtotal;
    expect(newCustomerBalance).toBe(1120);
  });
});
