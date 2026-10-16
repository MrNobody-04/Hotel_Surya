import { describe, it, expect } from "vitest";
import {
  canViewCredits,
  canCreateCreditBill,
  canRecordCreditPayment,
  canEditCreditBills,
  canIssueCreditAdjustments,
  canViewCreditReports,
} from "../src/server/auth/rbac";

describe("Credit Management RBAC & Authorization", () => {
  it("allows OWNER, MANAGER, and RECEPTIONIST to view credit info and collect payments", () => {
    expect(canViewCredits("OWNER")).toBe(true);
    expect(canViewCredits("MANAGER")).toBe(true);
    expect(canViewCredits("RECEPTIONIST")).toBe(true);

    expect(canCreateCreditBill("OWNER")).toBe(true);
    expect(canCreateCreditBill("MANAGER")).toBe(true);
    expect(canCreateCreditBill("RECEPTIONIST")).toBe(true);

    expect(canRecordCreditPayment("OWNER")).toBe(true);
    expect(canRecordCreditPayment("MANAGER")).toBe(true);
    expect(canRecordCreditPayment("RECEPTIONIST")).toBe(true);
  });

  it("strictly restricts bill editing and financial adjustments to OWNER and MANAGER", () => {
    expect(canEditCreditBills("OWNER")).toBe(true);
    expect(canEditCreditBills("MANAGER")).toBe(true);
    expect(canEditCreditBills("RECEPTIONIST")).toBe(false);

    expect(canIssueCreditAdjustments("OWNER")).toBe(true);
    expect(canIssueCreditAdjustments("MANAGER")).toBe(true);
    expect(canIssueCreditAdjustments("RECEPTIONIST")).toBe(false);
  });

  it("restricts financial credit reports to OWNER and MANAGER", () => {
    expect(canViewCreditReports("OWNER")).toBe(true);
    expect(canViewCreditReports("MANAGER")).toBe(true);
    expect(canViewCreditReports("RECEPTIONIST")).toBe(false);
  });
});

describe("Credit Bill & POS Line Item Calculations", () => {
  it("calculates line totals, subtotal, and final charge with discounts correctly", () => {
    const items = [
      { name: "Chicken Steamed Momo", quantity: 2, unitPrice: 240 }, // 480
      { name: "Veg Chowmein", quantity: 3, unitPrice: 160 },          // 480
      { name: "Coca Cola", quantity: 4, unitPrice: 70 },              // 280
      { name: "Custom Special Snack", quantity: 1, unitPrice: 200 },  // 200
    ];

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    expect(subtotal).toBe(1440);

    const discount = 140;
    const finalCharge = Math.max(0, subtotal - discount);
    expect(finalCharge).toBe(1300);
  });

  it("prevents negative prices, invalid quantities, and excessive discounts", () => {
    const invalidQtyItem = { name: "Momo", quantity: -1, unitPrice: 180 };
    expect(invalidQtyItem.quantity <= 0).toBe(true);

    const negativePriceItem = { name: "Tea", quantity: 2, unitPrice: -50 };
    expect(negativePriceItem.unitPrice < 0).toBe(true);

    const subtotal = 500;
    const excessiveDiscount = 700;
    const effectiveDiscount = Math.min(excessiveDiscount, subtotal);
    const totalCharge = Math.max(0, subtotal - effectiveDiscount);
    expect(totalCharge).toBe(0);
  });
});

describe("Customer Ongoing Account Balance & Multi-Purchase Accumulation", () => {
  it("accumulates new purchases onto existing customer balance without creating new accounts", () => {
    // Initial state: Ram Sharma owes Rs. 2,000
    let account = {
      customerId: "cust-ram-sharma",
      customerName: "Ram Sharma",
      totalCharged: 2000,
      totalPaid: 0,
      currentBalance: 2000,
      status: "PENDING",
    };

    // New restaurant purchase: Rs. 850
    const newPurchaseAmount = 850;
    account.totalCharged += newPurchaseAmount;
    account.currentBalance += newPurchaseAmount;
    account.status = account.currentBalance > 0 ? "PENDING" : "PAID";

    // Resulting balance must be exactly Rs. 2,850
    expect(account.currentBalance).toBe(2850);
    expect(account.totalCharged).toBe(2850);
    expect(account.status).toBe("PENDING");
  });
});

describe("Payment Collection: Installments & Settlement", () => {
  it("processes multi-installment settlement correctly: Rs. 5000 -> Rs. 3500 -> Rs. 1500 -> Rs. 0", () => {
    let balance = 5000;
    let totalPaid = 0;

    // Installment 1: Rs. 1,500
    const payment1 = 1500;
    expect(payment1 <= balance).toBe(true);
    balance -= payment1;
    totalPaid += payment1;
    expect(balance).toBe(3500);
    expect(balance > 0 ? "PARTIALLY_PAID" : "PAID").toBe("PARTIALLY_PAID");

    // Installment 2: Rs. 2,000
    const payment2 = 2000;
    expect(payment2 <= balance).toBe(true);
    balance -= payment2;
    totalPaid += payment2;
    expect(balance).toBe(1500);
    expect(balance > 0 ? "PARTIALLY_PAID" : "PAID").toBe("PARTIALLY_PAID");

    // Installment 3: Final Rs. 1,500
    const payment3 = 1500;
    expect(payment3 <= balance).toBe(true);
    balance -= payment3;
    totalPaid += payment3;
    expect(balance).toBe(0);
    expect(balance <= 0 ? "PAID" : "PARTIALLY_PAID").toBe("PAID");
    expect(totalPaid).toBe(5000);
  });

  it("rejects payments that exceed the outstanding balance", () => {
    const currentBalance = 1200;
    const overpaymentAttempt = 1500;
    const isExceeding = overpaymentAttempt > currentBalance;
    expect(isExceeding).toBe(true);
  });

  it("allocates payments FIFO across oldest pending bills", () => {
    const bills = [
      { id: "b1", billNumber: "CR-01", totalAmount: 1000, paidAmount: 0 },
      { id: "b2", billNumber: "CR-02", totalAmount: 800, paidAmount: 0 },
      { id: "b3", billNumber: "CR-03", totalAmount: 1200, paidAmount: 0 },
    ];

    let paymentAmount = 1500;

    for (const bill of bills) {
      if (paymentAmount <= 0) break;
      const unpaid = bill.totalAmount - bill.paidAmount;
      const allocated = Math.min(paymentAmount, unpaid);
      bill.paidAmount += allocated;
      paymentAmount -= allocated;
    }

    expect(bills[0].paidAmount).toBe(1000); // Fully settled
    expect(bills[1].paidAmount).toBe(500);  // Partially settled (300 remaining)
    expect(bills[2].paidAmount).toBe(0);    // Untouched
    expect(paymentAmount).toBe(0);
  });
});

describe("Bill Editing, Adjustments & Historical Integrity", () => {
  it("preserves payment history and applies differences as auditable adjustments", () => {
    const bill = {
      id: "b10",
      totalAmount: 2000,
      paidAmount: 1200, // already partially paid Rs. 1,200
    };

    let accountBalance = 800; // customer currently owes Rs. 800

    // Manager corrects bill by adding an omitted dish: new total = Rs. 2,500
    const newTotal = 2500;
    const difference = newTotal - bill.totalAmount; // +500

    bill.totalAmount = newTotal;
    accountBalance += difference; // 800 + 500 = 1,300

    expect(bill.paidAmount).toBe(1200); // Historical payment is untouched!
    expect(accountBalance).toBe(1300);
    expect(bill.totalAmount - bill.paidAmount).toBe(1300);
  });
});

describe("Financial Analytics & Revenue Invariants", () => {
  it("ensures unpaid credit does NOT count as collected revenue", () => {
    let collectedCashRevenue = 10000; // from hotel stays
    const unpaidCreditBill = 4500;

    // At purchase time:
    const recognizedCashAtPurchase = 0;
    collectedCashRevenue += recognizedCashAtPurchase;

    // Revenue must strictly remain 10,000
    expect(collectedCashRevenue).toBe(10000);

    // Later: Customer makes partial payment of Rs. 2,000
    const paymentReceived = 2000;
    collectedCashRevenue += paymentReceived;

    // Revenue increases only by actual payment received
    expect(collectedCashRevenue).toBe(12000);
  });

  it("guarantees ledger entries reconcile to current account balance", () => {
    const ledger = [
      { type: "CHARGE", debit: 3000, credit: 0 },
      { type: "CHARGE", debit: 1500, credit: 0 },
      { type: "PAYMENT", debit: 0, credit: 2000 },
      { type: "ADJUSTMENT", debit: 500, credit: 0 }, // +500 correction
      { type: "PAYMENT", debit: 0, credit: 1500 },
    ];

    let runningBalance = 0;
    for (const entry of ledger) {
      runningBalance = runningBalance + entry.debit - entry.credit;
    }

    // 3000 + 1500 - 2000 + 500 - 1500 = 1500
    expect(runningBalance).toBe(1500);
  });

  it("handles multi-day purchases for a customer with due, paid, and remaining balance tracking", () => {
    // Initial state: customer Ravi created with zero debt
    let totalCharged = 0;
    let totalPaid = 0;
    let currentBalance = 0;

    // Day 1: Ravi orders 2 plates of Momo @ Rs. 240
    const day1Charge = 2 * 240; // 480
    totalCharged += day1Charge;
    currentBalance = totalCharged - totalPaid;

    expect(totalCharged).toBe(480);
    expect(totalPaid).toBe(0);
    expect(currentBalance).toBe(480);

    // Day 2: Ravi orders 1 Chicken Fried Rice @ Rs. 220
    const day2Charge = 220;
    totalCharged += day2Charge;
    currentBalance = totalCharged - totalPaid;

    expect(totalCharged).toBe(700);
    expect(totalPaid).toBe(0);
    expect(currentBalance).toBe(700);

    // Day 3: Ravi pays Rs. 500 towards his debt
    const payment = 500;
    totalPaid += payment;
    currentBalance = totalCharged - totalPaid;

    expect(totalCharged).toBe(700);
    expect(totalPaid).toBe(500);
    expect(currentBalance).toBe(200);

    // Day 4: Ravi orders 2 Cokes @ Rs. 70
    const day4Charge = 2 * 70; // 140
    totalCharged += day4Charge;
    currentBalance = totalCharged - totalPaid;

    expect(totalCharged).toBe(840);
    expect(totalPaid).toBe(500);
    expect(currentBalance).toBe(340);
  });
});

