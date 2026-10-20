import prisma from "@/lib/db";
import {
  CreditAccountStatus,
  CreditBillStatus,
  CreditLedgerType,
  PaymentMethod,
  Role,
} from "@/types";
import { logAuditEvent } from "./audit.service";
import { canEditCreditBills } from "../auth/rbac";

export interface CreateCreditItemInput {
  serviceItemId?: string | null;
  name: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice?: number | null;
  isCustom?: boolean;
  notes?: string | null;
}

export interface CreateCreditPurchaseInput {
  customerId: string;
  items: CreateCreditItemInput[];
  discount?: number;
  tax?: number;
  serviceCharge?: number;
  dueDate?: string | null;
  notes?: string | null;
}

export interface EditCreditBillInput {
  items: CreateCreditItemInput[];
  discount?: number;
  tax?: number;
  serviceCharge?: number;
  dueDate?: string | null;
  notes?: string | null;
  reason: string;
}

export interface CollectCreditPaymentInput {
  accountId: string;
  billId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Generate sequential, unique Bill Number (e.g. CR-202610-001)
 */
async function generateBillNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `CR-${yearMonth}-`;

  const count = await prisma.creditBill.count({
    where: {
      billNumber: { startsWith: prefix },
    },
  });

  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

/**
 * Generate sequential, unique Receipt Number (e.g. RCP-CR-202610-001)
 */
async function generateReceiptNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `RCP-CR-${yearMonth}-`;

  const count = await prisma.creditPayment.count({
    where: {
      receiptNumber: { startsWith: prefix },
    },
  });

  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

/**
 * Find or automatically create a persistent CreditAccount for a Customer
 */
export async function getOrCreateCreditAccount(customerId: string) {
  const existing = await prisma.creditAccount.findUnique({
    where: { customerId },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          contactNumber: true,
          citizenshipNumber: true,
          address: true,
        },
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Verify customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      fullName: true,
      contactNumber: true,
      citizenshipNumber: true,
      address: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  return prisma.creditAccount.create({
    data: {
      customerId,
      status: "PAID" as any,
      currentBalance: 0,
      totalCharged: 0,
      totalPaid: 0,
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          contactNumber: true,
          citizenshipNumber: true,
          address: true,
        },
      },
    },
  });
}

/**
 * Create a new credit purchase / bill attached to the customer's ongoing credit account
 */
export async function createCreditPurchase(
  data: CreateCreditPurchaseInput,
  userId: string,
  userName: string
) {
  if (!data.customerId) {
    throw new Error("Customer is required to create a credit purchase");
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("At least one menu or custom item is required");
  }

  // Validate items
  for (const item of data.items) {
    if (!item.name || !item.name.trim()) {
      throw new Error("Item name cannot be empty");
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      throw new Error(`Invalid quantity for "${item.name}". Must be at least 1.`);
    }
    if (typeof item.unitPrice !== "number" || item.unitPrice < 0) {
      throw new Error(`Invalid price for "${item.name}". Price cannot be negative.`);
    }
  }

  // Calculations
  const subtotal = Math.round(
    data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100;

  const discount = Math.max(0, Number(data.discount) || 0);
  const tax = Math.max(0, Number(data.tax) || 0);
  const serviceCharge = Math.max(0, Number(data.serviceCharge) || 0);

  const totalAmount = Math.max(
    0,
    Math.round((subtotal - discount + tax + serviceCharge) * 100) / 100
  );

  const billNumber = await generateBillNumber();

  // Execute in transactional context to guarantee atomicity and ledger consistency
  return prisma.$transaction(async (tx) => {
    // 1. Get or create the customer's credit account
    let account = await tx.creditAccount.findUnique({
      where: { customerId: data.customerId },
    });

    if (!account) {
      account = await tx.creditAccount.create({
        data: {
          customerId: data.customerId,
          status: "PAID" as any,
          currentBalance: 0,
          totalCharged: 0,
          totalPaid: 0,
        },
      });
    }

    const previousBalance = account.currentBalance;
    const newBalance = Math.round((previousBalance + totalAmount) * 100) / 100;
    const newTotalCharged = Math.round((account.totalCharged + totalAmount) * 100) / 100;

    // 2. Create the CreditBill
    const bill = await tx.creditBill.create({
      data: {
        billNumber,
        accountId: account.id,
        customerId: data.customerId,
        status: "PENDING" as any,
        subtotal,
        discount,
        tax,
        serviceCharge,
        totalAmount,
        paidAmount: 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes?.trim() || null,
        createdById: userId,
        items: {
          create: data.items.map((item) => ({
            serviceItemId: item.serviceItemId || null,
            name: item.name.trim(),
            category: item.category?.trim() || null,
            quantity: Math.floor(item.quantity),
            unitPrice: item.unitPrice,
            total: Math.round(item.quantity * item.unitPrice * 100) / 100,
            originalPrice: item.originalPrice !== undefined ? item.originalPrice : null,
            isCustom: Boolean(item.isCustom),
            notes: item.notes?.trim() || null,
          })),
        },
      },
      include: {
        items: true,
        customer: {
          select: { id: true, fullName: true, contactNumber: true },
        },
      },
    });

    // 3. Update CreditAccount balance and status
    const updatedAccount = await tx.creditAccount.update({
      where: { id: account.id },
      data: {
        totalCharged: newTotalCharged,
        currentBalance: newBalance,
        status: newBalance > 0 ? ("PENDING" as any) : ("PAID" as any),
      },
    });

    // 4. Create Ledger Entry (CHARGE / Debit)
    await tx.creditLedgerEntry.create({
      data: {
        accountId: account.id,
        type: "CHARGE" as any,
        amount: totalAmount,
        debit: totalAmount,
        credit: 0,
        runningBalance: newBalance,
        description: `Credit purchase #${billNumber} (${data.items.length} items)`,
        referenceId: bill.id,
        referenceNumber: billNumber,
        createdById: userId,
      },
    });

    // 5. Audit Log
    await logAuditEvent({
      userId,
      userName,
      action: "CREDIT_PURCHASE_CREATED",
      entity: "CreditBill",
      entityId: bill.id,
      metadata: {
        billNumber,
        customerId: data.customerId,
        totalAmount,
        previousBalance,
        newBalance,
        itemsCount: data.items.length,
      },
    });

    return {
      bill,
      account: updatedAccount,
    };
  });
}

/**
 * Add items to an existing unpaid credit bill (append items directly to existing credit)
 */
export async function addItemsToExistingCreditBill(
  billId: string,
  items: CreateCreditItemInput[],
  userId: string,
  userName: string
) {
  if (!items || items.length === 0) {
    throw new Error("At least one menu or custom item is required");
  }

  // Validate items
  for (const item of items) {
    if (!item.name || !item.name.trim()) {
      throw new Error("Item name cannot be empty");
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      throw new Error(`Invalid quantity for "${item.name}". Must be at least 1.`);
    }
    if (typeof item.unitPrice !== "number" || item.unitPrice < 0) {
      throw new Error(`Invalid price for "${item.name}". Price cannot be negative.`);
    }
  }

  const addedSubtotal = Math.round(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100;

  return prisma.$transaction(async (tx) => {
    const bill = await tx.creditBill.findUnique({
      where: { id: billId },
      include: {
        account: true,
        customer: true,
      },
    });

    if (!bill) {
      throw new Error("Credit bill not found");
    }

    if (bill.status === "PAID") {
      throw new Error("Cannot add items to an already settled bill. Please create a new credit bill instead.");
    }

    // 1. Create the new items for this bill
    await tx.creditBillItem.createMany({
      data: items.map((item) => ({
        billId: bill.id,
        serviceItemId: item.serviceItemId || null,
        name: item.name.trim(),
        category: item.category?.trim() || null,
        quantity: Math.floor(item.quantity),
        unitPrice: item.unitPrice,
        total: Math.round(item.quantity * item.unitPrice * 100) / 100,
        originalPrice: item.originalPrice !== undefined ? item.originalPrice : null,
        isCustom: Boolean(item.isCustom),
        notes: item.notes?.trim() || null,
      })),
    });

    // 2. Update Bill totals
    const newBillSubtotal = Math.round((bill.subtotal + addedSubtotal) * 100) / 100;
    const newBillTotal = Math.round((bill.totalAmount + addedSubtotal) * 100) / 100;
    const remainingDue = Math.max(0, Math.round((newBillTotal - bill.paidAmount) * 100) / 100);

    const updatedBill = await tx.creditBill.update({
      where: { id: bill.id },
      data: {
        subtotal: newBillSubtotal,
        totalAmount: newBillTotal,
        status: remainingDue > 0 ? (bill.paidAmount > 0 ? ("PARTIALLY_PAID" as any) : ("PENDING" as any)) : ("PAID" as any),
      },
      include: {
        items: true,
        customer: {
          select: { id: true, fullName: true, contactNumber: true },
        },
      },
    });

    // 3. Update CreditAccount balance
    const account = bill.account;
    const previousBalance = account.currentBalance;
    const newBalance = Math.round((previousBalance + addedSubtotal) * 100) / 100;
    const newTotalCharged = Math.round((account.totalCharged + addedSubtotal) * 100) / 100;

    const updatedAccount = await tx.creditAccount.update({
      where: { id: account.id },
      data: {
        totalCharged: newTotalCharged,
        currentBalance: newBalance,
        status: newBalance > 0 ? ("PENDING" as any) : ("PAID" as any),
      },
    });

    // 4. Create Ledger Entry (CHARGE)
    await tx.creditLedgerEntry.create({
      data: {
        accountId: account.id,
        type: "CHARGE" as any,
        amount: addedSubtotal,
        debit: addedSubtotal,
        credit: 0,
        runningBalance: newBalance,
        description: `Added ${items.length} item(s) to Bill #${bill.billNumber}`,
        referenceId: bill.id,
        referenceNumber: bill.billNumber,
        createdById: userId,
      },
    });

    // 5. Audit Log
    await logAuditEvent({
      userId,
      userName,
      action: "CREDIT_BILL_ITEMS_ADDED",
      entity: "CreditBill",
      entityId: bill.id,
      metadata: {
        billNumber: bill.billNumber,
        customerId: bill.customerId,
        addedAmount: addedSubtotal,
        newBillTotal,
        previousBalance,
        newBalance,
        itemsCount: items.length,
      },
    });

    return {
      bill: updatedBill,
      account: updatedAccount,
    };
  });
}

/**
 * Edit a saved credit bill with financial adjustment tracking and audit preservation
 */
export async function editCreditBill(
  billId: string,
  data: EditCreditBillInput,
  userId: string,
  userName: string,
  userRole: Role
) {
  if (!canEditCreditBills(userRole)) {
    throw new Error("Forbidden: You do not have permission to edit saved credit bills");
  }

  if (!data.reason || data.reason.trim().length < 3) {
    throw new Error("A valid reason (minimum 3 characters) is required to edit a credit bill");
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("A bill must contain at least one item");
  }

  for (const item of data.items) {
    if (!item.name || !item.name.trim()) throw new Error("Item name cannot be empty");
    if (item.quantity <= 0) throw new Error(`Invalid quantity for "${item.name}"`);
    if (item.unitPrice < 0) throw new Error(`Invalid price for "${item.name}"`);
  }

  const existingBill = await prisma.creditBill.findUnique({
    where: { id: billId },
    include: {
      account: true,
      items: true,
      payments: true,
    },
  });

  if (!existingBill) {
    throw new Error("Credit bill not found");
  }

  const oldTotal = existingBill.totalAmount;

  // New totals
  const subtotal = Math.round(
    data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100;
  const discount = Math.max(0, Number(data.discount) || 0);
  const tax = Math.max(0, Number(data.tax) || 0);
  const serviceCharge = Math.max(0, Number(data.serviceCharge) || 0);
  const newTotal = Math.max(0, Math.round((subtotal - discount + tax + serviceCharge) * 100) / 100);

  const difference = Math.round((newTotal - oldTotal) * 100) / 100;

  return prisma.$transaction(async (tx) => {
    // 1. Delete old items and insert new items
    await tx.creditBillItem.deleteMany({
      where: { billId },
    });

    // 2. Determine updated bill status
    const remainingBillBalance = Math.round((newTotal - existingBill.paidAmount) * 100) / 100;
    let newBillStatus: CreditBillStatus = "PENDING";
    if (remainingBillBalance <= 0.01) {
      newBillStatus = "PAID";
    } else if (existingBill.paidAmount > 0) {
      newBillStatus = "PARTIALLY_PAID";
    }

    // 3. Update the Bill
    const updatedBill = await tx.creditBill.update({
      where: { id: billId },
      data: {
        subtotal,
        discount,
        tax,
        serviceCharge,
        totalAmount: newTotal,
        status: newBillStatus as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : existingBill.dueDate,
        notes: data.notes !== undefined ? (data.notes?.trim() || null) : existingBill.notes,
        items: {
          create: data.items.map((item) => ({
            serviceItemId: item.serviceItemId || null,
            name: item.name.trim(),
            category: item.category?.trim() || null,
            quantity: Math.floor(item.quantity),
            unitPrice: item.unitPrice,
            total: Math.round(item.quantity * item.unitPrice * 100) / 100,
            originalPrice: item.originalPrice !== undefined ? item.originalPrice : null,
            isCustom: Boolean(item.isCustom),
            notes: item.notes?.trim() || null,
          })),
        },
      },
      include: {
        items: true,
        customer: {
          select: { id: true, fullName: true, contactNumber: true },
        },
      },
    });

    // 4. Update the Customer Credit Account
    const account = existingBill.account;
    const newTotalCharged = Math.round((account.totalCharged + difference) * 100) / 100;
    const newAccountBalance = Math.round((account.currentBalance + difference) * 100) / 100;

    const updatedAccount = await tx.creditAccount.update({
      where: { id: account.id },
      data: {
        totalCharged: newTotalCharged,
        currentBalance: newAccountBalance,
        status: newAccountBalance <= 0.01 ? ("PAID" as any) : ("PARTIALLY_PAID" as any),
      },
    });

    // 5. Create CreditAdjustment record
    const adjustment = await tx.creditAdjustment.create({
      data: {
        accountId: account.id,
        billId,
        amount: difference,
        reason: data.reason.trim(),
        oldTotal,
        newTotal,
        createdById: userId,
      },
    });

    // 6. Record in Ledger
    await tx.creditLedgerEntry.create({
      data: {
        accountId: account.id,
        type: "ADJUSTMENT" as any,
        amount: Math.abs(difference),
        debit: difference > 0 ? difference : 0,
        credit: difference < 0 ? Math.abs(difference) : 0,
        runningBalance: newAccountBalance,
        description: `Bill #${existingBill.billNumber} corrected: ${data.reason.trim()} (Rs. ${oldTotal} → Rs. ${newTotal})`,
        referenceId: adjustment.id,
        referenceNumber: existingBill.billNumber,
        createdById: userId,
      },
    });

    // 7. Audit Log
    await logAuditEvent({
      userId,
      userName,
      action: "CREDIT_BILL_EDITED",
      entity: "CreditBill",
      entityId: billId,
      metadata: {
        billNumber: existingBill.billNumber,
        reason: data.reason.trim(),
        oldTotal,
        newTotal,
        difference,
        previousAccountBalance: account.currentBalance,
        newAccountBalance,
      },
    });

    return {
      bill: updatedBill,
      account: updatedAccount,
      adjustment,
    };
  });
}

/**
 * Collect full or partial installment payment against a customer's credit balance
 */
export async function collectCreditPayment(
  data: CollectCreditPaymentInput,
  userId: string,
  userName: string
) {
  if (!data.accountId) {
    throw new Error("Account ID is required to collect payment");
  }

  const paymentAmount = Math.round(Number(data.amount) * 100) / 100;
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Idempotency check: prevent duplicate transactions from rapid double-clicks
  if (data.idempotencyKey) {
    const existingPayment = await prisma.creditPayment.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: {
        account: {
          include: {
            customer: {
              select: { id: true, fullName: true, contactNumber: true },
            },
          },
        },
        bill: {
          select: { id: true, billNumber: true, totalAmount: true, paidAmount: true },
        },
      },
    });

    if (existingPayment) {
      return {
        payment: existingPayment,
        isDuplicate: true,
      };
    }
  }

  const account = await prisma.creditAccount.findUnique({
    where: { id: data.accountId },
    include: {
      customer: {
        select: { id: true, fullName: true, contactNumber: true },
      },
    },
  });

  if (!account) {
    throw new Error("Credit account not found");
  }

  // Prevent paying more than owed
  if (paymentAmount > account.currentBalance + 0.01) {
    throw new Error(
      `Payment amount (Rs. ${paymentAmount}) cannot exceed the current outstanding balance (Rs. ${account.currentBalance})`
    );
  }

  const receiptNumber = await generateReceiptNumber();

  return prisma.$transaction(async (tx) => {
    // Re-verify balance in transactional lock
    const currentAccount = await tx.creditAccount.findUniqueOrThrow({
      where: { id: data.accountId },
    });

    const previousBalance = currentAccount.currentBalance;
    const remainingBalance = Math.max(0, Math.round((previousBalance - paymentAmount) * 100) / 100);
    const newTotalPaid = Math.round((currentAccount.totalPaid + paymentAmount) * 100) / 100;

    // Allocate payment to bills
    let remainingToAllocate = paymentAmount;

    if (data.billId) {
      // Specified target bill
      const bill = await tx.creditBill.findUnique({
        where: { id: data.billId },
      });

      if (bill && bill.accountId === data.accountId) {
        const billUnpaid = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
        const allocatedToThisBill = Math.min(remainingToAllocate, billUnpaid);
        const newPaidAmount = Math.round((bill.paidAmount + allocatedToThisBill) * 100) / 100;
        const isSettled = newPaidAmount >= bill.totalAmount - 0.01;

        await tx.creditBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaidAmount,
            status: isSettled ? ("PAID" as any) : ("PARTIALLY_PAID" as any),
          },
        });

        remainingToAllocate = Math.round((remainingToAllocate - allocatedToThisBill) * 100) / 100;
      }
    }

    // If there is any remaining unallocated amount, allocate FIFO across oldest pending/partially paid bills
    if (remainingToAllocate > 0.01) {
      const pendingBills = await tx.creditBill.findMany({
        where: {
          accountId: data.accountId,
          status: { in: ["PENDING" as any, "PARTIALLY_PAID" as any] },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const bill of pendingBills) {
        if (remainingToAllocate <= 0.01) break;
        const billUnpaid = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
        if (billUnpaid <= 0) continue;

        const allocated = Math.min(remainingToAllocate, billUnpaid);
        const newPaid = Math.round((bill.paidAmount + allocated) * 100) / 100;
        const isSettled = newPaid >= bill.totalAmount - 0.01;

        await tx.creditBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaid,
            status: isSettled ? ("PAID" as any) : ("PARTIALLY_PAID" as any),
          },
        });

        remainingToAllocate = Math.round((remainingToAllocate - allocated) * 100) / 100;
      }
    }

    // 1. Create the Payment Record
    const payment = await tx.creditPayment.create({
      data: {
        receiptNumber,
        accountId: data.accountId,
        billId: data.billId || null,
        amount: paymentAmount,
        paymentMethod: data.paymentMethod || "CASH",
        previousBalance,
        remainingBalance,
        notes: data.notes?.trim() || null,
        referenceNumber: data.referenceNumber?.trim() || null,
        idempotencyKey: data.idempotencyKey || null,
        recordedById: userId,
      },
      include: {
        account: {
          include: {
            customer: {
              select: { id: true, fullName: true, contactNumber: true },
            },
          },
        },
        bill: {
          select: { id: true, billNumber: true, totalAmount: true, paidAmount: true },
        },
      },
    });

    // 2. Update CreditAccount
    const updatedAccount = await tx.creditAccount.update({
      where: { id: data.accountId },
      data: {
        totalPaid: newTotalPaid,
        currentBalance: remainingBalance,
        status: remainingBalance <= 0.01 ? ("PAID" as any) : ("PARTIALLY_PAID" as any),
      },
    });

    // 3. Create CreditLedgerEntry (PAYMENT / Credit)
    await tx.creditLedgerEntry.create({
      data: {
        accountId: data.accountId,
        type: "PAYMENT" as any,
        amount: paymentAmount,
        debit: 0,
        credit: paymentAmount,
        runningBalance: remainingBalance,
        description: `Payment received via ${data.paymentMethod} (Receipt #${receiptNumber})`,
        referenceId: payment.id,
        referenceNumber: receiptNumber,
        createdById: userId,
      },
    });

    // 4. Audit Log
    await logAuditEvent({
      userId,
      userName,
      action: "CREDIT_PAYMENT_COLLECTED",
      entity: "CreditPayment",
      entityId: payment.id,
      metadata: {
        receiptNumber,
        accountId: data.accountId,
        customerId: account.customerId,
        amount: paymentAmount,
        paymentMethod: data.paymentMethod,
        previousBalance,
        remainingBalance,
      },
    });

    return {
      payment,
      account: updatedAccount,
      isDuplicate: false,
    };
  });
}

/**
 * Get comprehensive Credit Dashboard Metrics and Analytics
 */
export async function getCreditDashboardMetrics(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  const [
    accountsAggregate,
    totalAccountsCount,
    pendingPurchasesCount,
    partiallyPaidPurchasesCount,
    fullyPaidPurchasesCount,
    todayPaymentsAgg,
    monthPaymentsAgg,
    totalPaymentsAgg,
    recentPurchases,
    recentPayments,
    topDebtorsList,
  ] = await Promise.all([
    // Accounts aggregate: sum of balance & charges
    prisma.creditAccount.aggregate({
      _sum: {
        currentBalance: true,
        totalCharged: true,
        totalPaid: true,
      },
    }),

    // Total credit accounts count
    prisma.creditAccount.count(),

    // Pending bills count
    prisma.creditBill.count({ where: { status: "PENDING" as any } }),

    // Partially paid bills count
    prisma.creditBill.count({ where: { status: "PARTIALLY_PAID" as any } }),

    // Fully paid bills count
    prisma.creditBill.count({ where: { status: "PAID" as any } }),

    // Payments collected today
    prisma.creditPayment.aggregate({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      _sum: { amount: true },
    }),

    // Payments collected this month
    prisma.creditPayment.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),

    // Total lifetime payments collected against credit
    prisma.creditPayment.aggregate({
      _sum: { amount: true },
    }),

    // Recent purchases
    prisma.creditBill.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        customer: { select: { id: true, fullName: true, contactNumber: true } },
        items: true,
      },
    }),

    // Recent payments
    prisma.creditPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        account: {
          include: {
            customer: { select: { id: true, fullName: true, contactNumber: true } },
          },
        },
        bill: { select: { id: true, billNumber: true } },
      },
    }),

    // Customers with highest outstanding balances
    prisma.creditAccount.findMany({
      where: { currentBalance: { gt: 0 } },
      orderBy: { currentBalance: "desc" },
      take: 5,
      include: {
        customer: {
          select: { id: true, fullName: true, contactNumber: true },
        },
        _count: {
          select: {
            bills: {
              where: { status: { in: ["PENDING" as any, "PARTIALLY_PAID" as any] } },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  return {
    totalOutstandingCredit: accountsAggregate._sum.currentBalance || 0,
    totalCreditCharges: accountsAggregate._sum.totalCharged || 0,
    totalPaymentsCollected: totalPaymentsAgg._sum.amount || 0,
    totalAccountsCount,
    pendingPurchasesCount,
    partiallyPaidPurchasesCount,
    fullyPaidPurchasesCount,
    paymentsCollectedToday: todayPaymentsAgg._sum.amount || 0,
    paymentsCollectedThisMonth: monthPaymentsAgg._sum.amount || 0,
    recentPurchases: recentPurchases.map((b) => ({
      ...b,
      remainingAmount: Math.max(0, b.totalAmount - b.paidAmount),
    })),
    recentPayments: recentPayments.map((p) => ({
      ...p,
      customer: p.account.customer,
    })),
    topDebtors: topDebtorsList.map((a) => ({
      id: a.id,
      customerId: a.customerId,
      customerName: a.customer.fullName,
      contactNumber: a.customer.contactNumber,
      currentBalance: a.currentBalance,
      pendingBillsCount: a._count.bills,
      lastPaymentDate: a.payments[0]?.createdAt ? a.payments[0].createdAt.toISOString() : null,
    })),
  };
}

/**
 * Search and list Customer Credit Accounts
 */
export async function searchCreditAccounts(params: {
  q?: string;
  status?: string;
  minBalance?: number;
  take?: number;
  skip?: number;
}) {
  const take = params.take || 50;
  const skip = params.skip || 0;
  const q = params.q?.trim();

  let where: any = {};

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.minBalance !== undefined && params.minBalance > 0) {
    where.currentBalance = { gte: params.minBalance };
  }

  if (q) {
    where.customer = {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { contactNumber: { contains: q } },
        { citizenshipNumber: { contains: q } },
      ],
    };
  }

  // Strictly exclude room stay guests with no credit activity from customer credit desk
  where.NOT = {
    AND: [
      { totalCharged: 0 },
      { totalPaid: 0 },
      { bills: { none: {} } },
      { customer: { stays: { some: {} } } },
    ],
  };

  const [accounts, total] = await Promise.all([
    prisma.creditAccount.findMany({
      where,
      orderBy: [{ currentBalance: "desc" }, { updatedAt: "desc" }],
      take,
      skip,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            contactNumber: true,
            citizenshipNumber: true,
            address: true,
          },
        },
        _count: {
          select: {
            bills: {
              where: { status: { in: ["PENDING" as any, "PARTIALLY_PAID" as any] } },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.creditAccount.count({ where }),
  ]);

  return {
    accounts: accounts.map((a) => ({
      ...a,
      pendingBillsCount: a._count.bills,
      lastPaymentDate: a.payments[0]?.createdAt ? a.payments[0].createdAt.toISOString() : null,
    })),
    total,
  };
}

/**
 * Get comprehensive Customer Credit Account details including history and ledger
 */
export async function getCreditAccountDetails(accountId: string) {
  const account = await prisma.creditAccount.findUnique({
    where: { id: accountId },
    include: {
      customer: true,
      bills: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          payments: {
            orderBy: { createdAt: "desc" },
          },
          adjustments: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: {
          bill: {
            select: { id: true, billNumber: true },
          },
        },
      },
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      adjustments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!account) {
    throw new Error("Credit account not found");
  }

  return account;
}

/**
 * Get list of Credit Bills with filtering
 */
export async function getCreditBills(params: {
  status?: string;
  customerId?: string;
  accountId?: string;
  q?: string;
  take?: number;
  skip?: number;
}) {
  const take = params.take || 50;
  const skip = params.skip || 0;
  const q = params.q?.trim();

  let where: any = {};

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.customerId) {
    where.customerId = params.customerId;
  }

  if (params.accountId) {
    where.accountId = params.accountId;
  }

  if (q) {
    where.OR = [
      { billNumber: { contains: q, mode: "insensitive" } },
      { customer: { fullName: { contains: q, mode: "insensitive" } } },
      { customer: { contactNumber: { contains: q } } },
    ];
  }

  const [bills, total] = await Promise.all([
    prisma.creditBill.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        customer: {
          select: { id: true, fullName: true, contactNumber: true },
        },
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.creditBill.count({ where }),
  ]);

  return {
    bills: bills.map((b) => ({
      ...b,
      remainingAmount: Math.max(0, Math.round((b.totalAmount - b.paidAmount) * 100) / 100),
    })),
    total,
  };
}

/**
 * Get list of Credit Payments with filtering
 */
export async function getCreditPayments(params: {
  customerId?: string;
  accountId?: string;
  billId?: string;
  take?: number;
  skip?: number;
}) {
  const take = params.take || 50;
  const skip = params.skip || 0;

  let where: any = {};

  if (params.accountId) where.accountId = params.accountId;
  if (params.billId) where.billId = params.billId;
  if (params.customerId) {
    where.account = { customerId: params.customerId };
  }

  const [payments, total] = await Promise.all([
    prisma.creditPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        account: {
          include: {
            customer: {
              select: { id: true, fullName: true, contactNumber: true },
            },
          },
        },
        bill: {
          select: { id: true, billNumber: true },
        },
      },
    }),
    prisma.creditPayment.count({ where }),
  ]);

  return {
    payments: payments.map((p) => ({
      ...p,
      customer: p.account.customer,
    })),
    total,
  };
}

/**
 * Get chronological ledger entries for a customer credit account
 */
export async function getCreditLedger(accountId: string, take = 100, skip = 0) {
  const [entries, total] = await Promise.all([
    prisma.creditLedgerEntry.findMany({
      where: { accountId },
      orderBy: { createdAt: "asc" },
      take,
      skip,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.creditLedgerEntry.count({ where: { accountId } }),
  ]);

  return {
    entries,
    total,
  };
}
