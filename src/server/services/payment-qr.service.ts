import prisma from "@/lib/db";
import { logAuditEvent } from "./audit.service";

export interface CreatePaymentQrInput {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string;
  isDefault?: boolean;
  isActive?: boolean;
  notes?: string | null;
}

export interface UpdatePaymentQrInput {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  qrImageUrl?: string;
  isDefault?: boolean;
  isActive?: boolean;
  notes?: string | null;
}

export const DEFAULT_FALLBACK_QR = {
  id: "default-nabil-qr",
  bankName: "Nabil Bank",
  accountName: "SUJAN G.C.",
  accountNumber: "27710017501941",
  qrImageUrl: "/images/nabil-qr.jpg",
  isDefault: true,
  isActive: true,
  notes: "Works with Fonepay, Nabil Smart, eSewa, Khalti, IME Pay & all Nepali banking apps.",
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Fetch all configured payment QR codes
 */
export async function getPaymentQrs(includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };

  const qrs = await prisma.paymentQr.findMany({
    where,
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "asc" },
    ],
  });

  if (qrs.length === 0 && !includeInactive) {
    return [DEFAULT_FALLBACK_QR];
  }

  return qrs;
}

/**
 * Fetch a single payment QR by ID
 */
export async function getPaymentQrById(id: string) {
  return await prisma.paymentQr.findUnique({
    where: { id },
  });
}

/**
 * Create a new payment QR / bank details configuration
 */
export async function createPaymentQr(
  input: CreatePaymentQrInput,
  userId: string,
  userName: string
) {
  const bankName = input.bankName?.trim();
  const accountName = input.accountName?.trim();
  const accountNumber = input.accountNumber?.trim();
  const qrImageUrl = input.qrImageUrl?.trim();

  if (!bankName) throw new Error("Bank name is required");
  if (!accountName) throw new Error("Account holder name is required");
  if (!accountNumber) throw new Error("Account number is required");
  if (!qrImageUrl) throw new Error("QR code image is required");

  return await prisma.$transaction(async (tx) => {
    // Check if this is the very first QR or requested as default
    const existingCount = await tx.paymentQr.count();
    const shouldBeDefault = input.isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await tx.paymentQr.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await tx.paymentQr.create({
      data: {
        bankName,
        accountName,
        accountNumber,
        qrImageUrl,
        isDefault: shouldBeDefault,
        isActive: input.isActive !== undefined ? input.isActive : true,
        notes: input.notes?.trim() || null,
      },
    });

    await logAuditEvent({
      userId,
      userName,
      action: "PAYMENT_QR_CREATED",
      entity: "PaymentQr",
      entityId: created.id,
      metadata: {
        bankName: created.bankName,
        accountNumber: created.accountNumber,
        isDefault: created.isDefault,
      },
    });

    return created;
  });
}

/**
 * Update an existing payment QR / bank details
 */
export async function updatePaymentQr(
  id: string,
  input: UpdatePaymentQrInput,
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.paymentQr.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Payment QR record not found");
    }

    if (input.isDefault) {
      await tx.paymentQr.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await tx.paymentQr.update({
      where: { id },
      data: {
        ...(input.bankName !== undefined ? { bankName: input.bankName.trim() } : {}),
        ...(input.accountName !== undefined ? { accountName: input.accountName.trim() } : {}),
        ...(input.accountNumber !== undefined ? { accountNumber: input.accountNumber.trim() } : {}),
        ...(input.qrImageUrl !== undefined ? { qrImageUrl: input.qrImageUrl.trim() } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      },
    });

    await logAuditEvent({
      userId,
      userName,
      action: "PAYMENT_QR_UPDATED",
      entity: "PaymentQr",
      entityId: id,
      metadata: {
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        isDefault: updated.isDefault,
      },
    });

    return updated;
  });
}

/**
 * Set a specific QR as default / primary
 */
export async function setDefaultPaymentQr(
  id: string,
  userId: string,
  userName: string
) {
  return await updatePaymentQr(id, { isDefault: true }, userId, userName);
}

/**
 * Delete a payment QR record
 */
export async function deletePaymentQr(
  id: string,
  userId: string,
  userName: string
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.paymentQr.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Payment QR record not found");
    }

    await tx.paymentQr.delete({ where: { id } });

    // If the deleted one was default, set the oldest remaining record as default
    if (existing.isDefault) {
      const remaining = await tx.paymentQr.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      if (remaining) {
        await tx.paymentQr.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    await logAuditEvent({
      userId,
      userName,
      action: "PAYMENT_QR_DELETED",
      entity: "PaymentQr",
      entityId: id,
      metadata: {
        bankName: existing.bankName,
        accountNumber: existing.accountNumber,
      },
    });

    return { success: true, id };
  });
}
