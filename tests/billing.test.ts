import { describe, it, expect } from "vitest";
import { calculateStayBill } from "../src/server/services/billing.service";

describe("Billing Service Engine", () => {
  it("calculates room charge correctly with zero payments", () => {
    const result = calculateStayBill({
      roomPrice: 5000,
      billItems: [],
      payments: [],
    });

    expect(result.roomCharge).toBe(5000);
    expect(result.itemsTotal).toBe(0);
    expect(result.totalAmount).toBe(5000);
    expect(result.paidAmount).toBe(0);
    expect(result.outstandingBalance).toBe(5000);
    expect(result.isFullyPaid).toBe(false);
  });

  it("calculates unified bill with food, drinks, and prepayment", () => {
    const result = calculateStayBill({
      roomPrice: 5000,
      billItems: [
        {
          category: "FOOD",
          name: "Veg Momo",
          quantity: 2,
          unitPrice: 250,
          total: 500,
        },
        {
          category: "DRINK",
          name: "Coke",
          quantity: 3,
          unitPrice: 100,
          total: 300,
        },
      ],
      payments: [{ amount: 5000 }],
    });

    expect(result.roomCharge).toBe(5000);
    expect(result.foodTotal).toBe(500);
    expect(result.drinkTotal).toBe(300);
    expect(result.itemsTotal).toBe(800);
    expect(result.totalAmount).toBe(5800);
    expect(result.paidAmount).toBe(5000);
    expect(result.outstandingBalance).toBe(800);
    expect(result.isFullyPaid).toBe(false);
  });

  it("handles multiple split payments until fully paid", () => {
    const result = calculateStayBill({
      roomPrice: 5000,
      billItems: [
        {
          category: "FOOD",
          name: "Chicken Momo",
          quantity: 1,
          unitPrice: 500,
          total: 500,
        },
        {
          category: "DRINK",
          name: "Fresh Juice",
          quantity: 2,
          unitPrice: 150,
          total: 300,
        },
      ],
      payments: [
        { amount: 5000 }, // Prepayment Cash
        { amount: 500 },  // Food QR
        { amount: 300 },  // Drinks Card
      ],
    });

    expect(result.totalAmount).toBe(5800);
    expect(result.paidAmount).toBe(5800);
    expect(result.outstandingBalance).toBe(0);
    expect(result.isFullyPaid).toBe(true);
  });

  it("avoids floating point rounding imprecision", () => {
    const result = calculateStayBill({
      roomPrice: 100.1,
      billItems: [
        {
          category: "SERVICE",
          name: "Laundry",
          quantity: 1,
          unitPrice: 200.2,
          total: 200.2,
        },
      ],
      payments: [{ amount: 300.3 }],
    });

    expect(result.totalAmount).toBe(300.3);
    expect(result.paidAmount).toBe(300.3);
    expect(result.outstandingBalance).toBe(0);
    expect(result.isFullyPaid).toBe(true);
  });
});
