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

  it("recalculates stay bill correctly when room rate is corrected/discounted", () => {
    // Initial bill entered incorrectly at check-in with 6000 instead of negotiated 4500
    const initial = calculateStayBill({
      roomPrice: 6000,
      billItems: [{ category: "FOOD", name: "Tea", quantity: 2, unitPrice: 50, total: 100 }],
      payments: [{ amount: 2000 }],
    });
    expect(initial.totalAmount).toBe(6100);
    expect(initial.outstandingBalance).toBe(4100);

    // After updating room rate to 4500
    const corrected = calculateStayBill({
      roomPrice: 4500,
      billItems: [{ category: "FOOD", name: "Tea", quantity: 2, unitPrice: 50, total: 100 }],
      payments: [{ amount: 2000 }],
    });
    expect(corrected.roomCharge).toBe(4500);
    expect(corrected.totalAmount).toBe(4600);
    expect(corrected.outstandingBalance).toBe(2600);
  });

  it("recalculates bill correctly when item unit price is discounted", () => {
    // Original price: 300 x 2 = 600
    const originalItem = {
      category: "FOOD" as const,
      name: "Momo Special",
      quantity: 2,
      unitPrice: 300,
      total: 600,
    };
    const initial = calculateStayBill({
      roomPrice: 2000,
      billItems: [originalItem],
      payments: [],
    });
    expect(initial.totalAmount).toBe(2600);

    // After giving Rs. 50 discount per item (new unit price: 250)
    const discountedItem = {
      ...originalItem,
      unitPrice: 250,
      total: 2 * 250,
    };
    const discounted = calculateStayBill({
      roomPrice: 2000,
      billItems: [discountedItem],
      payments: [],
    });
    expect(discounted.itemsTotal).toBe(500);
    expect(discounted.totalAmount).toBe(2500);
    expect(discounted.outstandingBalance).toBe(2500);
  });

  it("recalculates bill properly when an accidental item is deleted", () => {
    const stayWithMistakenItem = {
      roomPrice: 2000,
      billItems: [
        { category: "FOOD" as const, name: "Khana Set", quantity: 1, unitPrice: 350, total: 350 },
        { category: "DRINK" as const, name: "Accidental Beer", quantity: 2, unitPrice: 400, total: 800 },
      ],
      payments: [{ amount: 2000 }],
    };
    const before = calculateStayBill(stayWithMistakenItem);
    expect(before.itemsTotal).toBe(1150);
    expect(before.totalAmount).toBe(3150);
    expect(before.outstandingBalance).toBe(1150);

    // Remove the accidental beer
    const after = calculateStayBill({
      ...stayWithMistakenItem,
      billItems: stayWithMistakenItem.billItems.filter((i) => i.name !== "Accidental Beer"),
    });
    expect(after.itemsTotal).toBe(350);
    expect(after.totalAmount).toBe(2350);
    expect(after.outstandingBalance).toBe(350);
  });
});
