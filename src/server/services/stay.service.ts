import prisma from "@/lib/db";
import { Gender, PaymentMethod, BillItemCategory, StayStatus } from "@/types";
import { calculateStayBill } from "./billing.service";
import { logAuditEvent } from "./audit.service";

export interface CheckInInput {
  customerId?: string;
  // If creating customer inline:
  newCustomer?: {
    fullName: string;
    gender: Gender;
    citizenshipNumber?: string | null;
    citizenshipPhotoUrl?: string | null;
    contactNumber: string;
    address?: string | null;
    notes?: string | null;
  };
  roomId: string;
  numberOfPeople: number;
  expectedCheckoutDate: Date | string;
  roomPrice: number; // Negotiated price
  accompanyingGuests?: Array<{
    fullName: string;
    gender: Gender;
  }>;
  notes?: string | null;
  // Optional prepayment at check-in:
  prepayment?: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
  } | null;
  userId: string;
  userName: string;
}

export async function checkIn(input: CheckInInput) {
  const result = await prisma.$transaction(
    async (tx) => {
    // 1. Verify room exists and is AVAILABLE (Double-booking protection)
    const room = await tx.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "AVAILABLE") {
      throw new Error(`Room ${room.roomNumber} is not available (current status: ${room.status})`);
    }

    // Check if there is already an active stay for this room
    const existingActiveStay = await tx.stay.findFirst({
      where: { roomId: input.roomId, status: "ACTIVE" },
    });
    if (existingActiveStay) {
      throw new Error(`Room ${room.roomNumber} already has an active stay`);
    }

    // 2. Resolve customer ID (either existing or newly created)
    let customerId = input.customerId;
    if (!customerId) {
      if (!input.newCustomer?.fullName || !input.newCustomer?.contactNumber) {
        throw new Error("Customer name and contact number are required");
      }
      const customer = await tx.customer.create({
        data: {
          fullName: input.newCustomer.fullName.trim(),
          gender: input.newCustomer.gender,
          citizenshipNumber: input.newCustomer.citizenshipNumber?.trim() || null,
          citizenshipPhotoUrl: input.newCustomer.citizenshipPhotoUrl || null,
          contactNumber: input.newCustomer.contactNumber.trim(),
          address: input.newCustomer.address?.trim() || null,
          notes: input.newCustomer.notes?.trim() || null,
        },
      });
      customerId = customer.id;
    }

    // 3. Generate Stay ID with date prefix and 01-based sequence: MM-DD-01 (e.g. 09-11-01)
    const checkInAt = new Date();
    const expectedCheckoutDate = new Date(input.expectedCheckoutDate);

    // Format Nepal date MM-DD
    const nepalParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(checkInAt);

    const month = nepalParts.find((p) => p.type === "month")?.value || String(checkInAt.getMonth() + 1).padStart(2, "0");
    const day = nepalParts.find((p) => p.type === "day")?.value || String(checkInAt.getDate()).padStart(2, "0");
    const prefix = `${month}-${day}-`;

    // Find highest sequence today starting from 1
    const existingStaysToday = await tx.stay.findMany({
      where: {
        id: { startsWith: prefix },
      },
      select: { id: true },
    });

    let nextSeq = 1;
    const seqNumbers = existingStaysToday
      .map((s) => parseInt(s.id.slice(prefix.length), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (seqNumbers.length > 0) {
      nextSeq = Math.max(...seqNumbers) + 1;
    }

    let finalStayId = `${prefix}${String(nextSeq).padStart(2, "0")}`;
    while (await tx.stay.findUnique({ where: { id: finalStayId } })) {
      nextSeq++;
      finalStayId = `${prefix}${String(nextSeq).padStart(2, "0")}`;
    }

    const stay = await tx.stay.create({
      data: {
        id: finalStayId,
        customerId,
        roomId: input.roomId,
        numberOfPeople: Math.max(1, Number(input.numberOfPeople) || 1),
        expectedCheckoutDate,
        checkInAt,
        roomPrice: Number(input.roomPrice),
        status: "ACTIVE",
        notes: input.notes?.trim() || null,
        createdById: input.userId,
      },
    });

    // 4. Create accompanying guests if provided
    if (input.accompanyingGuests && input.accompanyingGuests.length > 0) {
      for (const guest of input.accompanyingGuests) {
        if (guest.fullName?.trim()) {
          await tx.accompanyingGuest.create({
            data: {
              stayId: stay.id,
              fullName: guest.fullName.trim(),
              gender: guest.gender,
            },
          });
        }
      }
    }

    // 5. Update Room status to OCCUPIED
    await tx.room.update({
      where: { id: input.roomId },
      data: { status: "OCCUPIED" },
    });

    // 6. Handle optional Prepayment
    if (input.prepayment && Number(input.prepayment.amount) > 0) {
      await tx.payment.create({
        data: {
          stayId: stay.id,
          amount: Number(input.prepayment.amount),
          method: input.prepayment.method || "CASH",
          timestamp: new Date(),
          notes: input.prepayment.notes?.trim() || "Prepayment at check-in",
          recordedById: input.userId,
        },
      });
    }

    return { stay, room, customerId };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  // 7. Write Audit Log after transaction commits
  await logAuditEvent({
    userId: input.userId,
    userName: input.userName,
    action: "CHECKIN_CREATED",
    entity: "Stay",
    entityId: result.stay.id,
    metadata: {
      roomNumber: result.room.roomNumber,
      customerId: result.customerId,
      numberOfPeople: input.numberOfPeople,
      roomPrice: input.roomPrice,
      prepaymentAmount: input.prepayment?.amount || 0,
    },
  });

  return result.stay;
}

export async function addBillItem(input: {
  stayId: string;
  category: BillItemCategory;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  userId: string;
  userName: string;
}) {
  const stay = await prisma.stay.findUnique({
    where: { id: input.stayId },
  });

  if (!stay) throw new Error("Stay not found");
  if (stay.status !== "ACTIVE") throw new Error("Cannot add items to a checked-out stay");

  const quantity = Math.max(1, Number(input.quantity) || 1);
  const unitPrice = Number(input.unitPrice);
  const total = Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100;

  const item = await prisma.billItem.create({
    data: {
      stayId: input.stayId,
      category: input.category,
      name: input.name.trim(),
      quantity,
      unitPrice,
      total,
      notes: input.notes?.trim() || null,
      createdById: input.userId,
    },
  });

  await logAuditEvent({
    userId: input.userId,
    userName: input.userName,
    action: "ITEM_ADDED",
    entity: "BillItem",
    entityId: item.id,
    metadata: {
      stayId: input.stayId,
      name: item.name,
      category: item.category,
      quantity,
      unitPrice,
      total,
    },
  });

  return item;
}

export async function addPayment(input: {
  stayId: string;
  amount: number;
  method: PaymentMethod;
  notes?: string | null;
  idempotencyKey?: string | null;
  userId: string;
  userName: string;
}) {
  const stay = await prisma.stay.findUnique({
    where: { id: input.stayId },
    include: { billItems: true, payments: true },
  });

  if (!stay) throw new Error("Stay not found");
  if (stay.status !== "ACTIVE") throw new Error("Cannot add payment to a checked-out stay");

  const amount = Number(input.amount);
  if (amount <= 0) throw new Error("Payment amount must be greater than zero");

  // Idempotency check: if key provided and already exists, return existing
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;
  }

  const payment = await prisma.payment.create({
    data: {
      stayId: input.stayId,
      amount,
      method: input.method,
      timestamp: new Date(),
      notes: input.notes?.trim() || null,
      idempotencyKey: input.idempotencyKey || null,
      recordedById: input.userId,
    },
  });

  await logAuditEvent({
    userId: input.userId,
    userName: input.userName,
    action: "PAYMENT_CREATED",
    entity: "Payment",
    entityId: payment.id,
    metadata: {
      stayId: input.stayId,
      amount,
      method: input.method,
    },
  });

  return payment;
}

export async function checkOut(input: {
  stayId: string;
  finalPayment?: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
  } | null;
  adminOverrideReason?: string | null;
  userId: string;
  userName: string;
  userRole: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify stay exists and is ACTIVE
    const stay = await tx.stay.findUnique({
      where: { id: input.stayId },
      include: {
        room: true,
        customer: true,
        billItems: true,
        payments: true,
      },
    });

    if (!stay) throw new Error("Stay record not found");
    if (stay.status !== "ACTIVE") {
      throw new Error(`Stay is already ${stay.status}. Double checkout prevented.`);
    }

    // 2. Process final payment if provided during checkout
    if (input.finalPayment && Number(input.finalPayment.amount) > 0) {
      const paymentAmount = Number(input.finalPayment.amount);
      const newPayment = await tx.payment.create({
        data: {
          stayId: stay.id,
          amount: paymentAmount,
          method: input.finalPayment.method || "CASH",
          timestamp: new Date(),
          notes: input.finalPayment.notes?.trim() || "Checkout settlement payment",
          recordedById: input.userId,
        },
      });
      stay.payments.push(newPayment);
    }

    // 3. Recalculate bill
    const bill = calculateStayBill({
      roomPrice: stay.roomPrice,
      billItems: stay.billItems as any,
      payments: stay.payments,
    });

    // 4. Verify balance is zero unless authorized admin override
    if (bill.outstandingBalance > 0) {
      if (input.adminOverrideReason && (input.userRole === "OWNER" || input.userRole === "MANAGER")) {
        // Controlled override allowed with audit record
      } else {
        throw new Error(
          `Cannot checkout with outstanding balance of NPR ${bill.outstandingBalance}. Full payment required.`
        );
      }
    }

    // 5. Record checkout timestamp and status
    const checkoutAt = new Date();

    const updatedStay = await tx.stay.update({
      where: { id: stay.id },
      data: {
        status: "CHECKED_OUT",
        checkoutAt,
      },
    });

    // 6. Reset room status to AVAILABLE
    await tx.room.update({
      where: { id: stay.roomId },
      data: { status: "AVAILABLE" },
    });

    return {
      success: true,
      stay: updatedStay,
      bill,
      checkoutAt,
      roomNumber: stay.room.roomNumber,
      customerName: stay.customer.fullName,
    };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  // 7. Write immutable audit log after transaction commits
  await logAuditEvent({
    userId: input.userId,
    userName: input.userName,
    action: "CHECKOUT_COMPLETED",
    entity: "Stay",
    entityId: result.stay.id,
    metadata: {
      roomNumber: result.roomNumber,
      customerName: result.customerName,
      totalAmount: result.bill.totalAmount,
      paidAmount: result.bill.paidAmount,
      outstandingBalance: result.bill.outstandingBalance,
      adminOverrideReason: input.adminOverrideReason || null,
      checkoutAt: result.checkoutAt.toISOString(),
    },
  });

  return {
    stay: result.stay,
    bill: result.bill,
    checkoutAt: result.checkoutAt,
    success: true,
  };
}

export async function getStayById(id: string) {
  const stay = await prisma.stay.findUnique({
    where: { id },
    include: {
      customer: true,
      room: true,
      accompanyingGuests: true,
      billItems: {
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { name: true } } },
      },
      payments: {
        orderBy: { timestamp: "asc" },
        include: { recordedBy: { select: { name: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!stay) return null;

  const bill = calculateStayBill({
    roomPrice: stay.roomPrice,
    billItems: stay.billItems as any,
    payments: stay.payments,
  });

  return {
    ...stay,
    billCalculation: bill,
  };
}

export async function getActiveStays() {
  const stays = await prisma.stay.findMany({
    where: { status: "ACTIVE" },
    orderBy: { checkInAt: "desc" },
    include: {
      customer: true,
      room: true,
      accompanyingGuests: true,
      billItems: true,
      payments: true,
      createdBy: { select: { name: true } },
    },
  });

  return stays.map((stay) => {
    const bill = calculateStayBill({
      roomPrice: stay.roomPrice,
      billItems: stay.billItems as any,
      payments: stay.payments,
    });

    return {
      ...stay,
      billCalculation: bill,
    };
  });
}

export async function getHistoricalStays(filters?: {
  roomId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  take?: number;
  skip?: number;
}) {
  const where: any = {
    status: "CHECKED_OUT",
  };

  if (filters?.roomId) where.roomId = filters.roomId;
  if (filters?.customerId) where.customerId = filters.customerId;
  if (filters?.startDate || filters?.endDate) {
    where.checkInAt = {};
    if (filters.startDate) where.checkInAt.gte = filters.startDate;
    if (filters.endDate) where.checkInAt.lte = filters.endDate;
  }

  const [stays, total] = await Promise.all([
    prisma.stay.findMany({
      where,
      orderBy: { checkoutAt: "desc" },
      take: filters?.take || 50,
      skip: filters?.skip || 0,
      include: {
        customer: true,
        room: true,
        accompanyingGuests: true,
        billItems: true,
        payments: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.stay.count({ where }),
  ]);

  return {
    stays: stays.map((stay) => ({
      ...stay,
      billCalculation: calculateStayBill({
        roomPrice: stay.roomPrice,
        billItems: stay.billItems as any,
        payments: stay.payments,
      }),
    })),
    total,
  };
}

export async function deleteStay(
  id: string,
  userId: string,
  userName: string,
  deleteCustomerIfOrphaned: boolean = false
) {
  return await prisma.$transaction(async (tx) => {
    const stay = await tx.stay.findUnique({
      where: { id },
      include: {
        customer: true,
        room: true,
      },
    });

    if (!stay) {
      throw new Error("Stay record not found");
    }

    const customerId = stay.customerId;
    const roomId = stay.roomId;
    const roomNumber = stay.room.roomNumber;
    const guestName = stay.customer.fullName;
    const wasActive = stay.status === "ACTIVE";

    // Delete associated records
    await tx.billItem.deleteMany({ where: { stayId: id } });
    await tx.payment.deleteMany({ where: { stayId: id } });
    await tx.accompanyingGuest.deleteMany({ where: { stayId: id } });

    // Delete stay
    await tx.stay.delete({
      where: { id },
    });

    // Reset room status to AVAILABLE if the stay was ACTIVE and no other active stay remains
    if (wasActive) {
      const remainingActiveStay = await tx.stay.findFirst({
        where: { roomId, status: "ACTIVE" },
      });
      if (!remainingActiveStay) {
        await tx.room.update({
          where: { id: roomId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    // Optionally clean up customer profile if they have no other stays
    let customerDeleted = false;
    if (deleteCustomerIfOrphaned) {
      const otherStaysCount = await tx.stay.count({
        where: { customerId },
      });
      if (otherStaysCount === 0) {
        await tx.customer.delete({
          where: { id: customerId },
        });
        customerDeleted = true;
      }
    }

    // Audit log
    await logAuditEvent({
      userId,
      userName,
      action: "STAY_DELETED",
      entity: "Stay",
      entityId: id,
      metadata: {
        roomNumber,
        guestName,
        customerDeleted,
        wasActive,
      },
    });

    return {
      id,
      roomNumber,
      guestName,
      customerDeleted,
      wasActive,
    };
  });
}
