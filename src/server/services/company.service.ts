import prisma from "@/lib/db";
import { PaymentMethod } from "@/types";
import { logAuditEvent } from "./audit.service";
import { invalidateDashboardMetricsCache } from "./analytics.service";

export interface CreateCompanyInput {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCompanyInput {
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface RecordCompanyPaymentInput {
  companyId?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string | null;
  referenceNumber?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

/**
 * Generate sequential unique receipt number for Company payments (e.g. RCP-CMP-202610-001)
 */
async function generateCompanyReceiptNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `RCP-CMP-${yearMonth}-`;

  const count = await prisma.companyPayment.count({
    where: {
      receiptNumber: { startsWith: prefix },
    },
  });

  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

export async function getAllCompanies(search?: string) {
  const where: any = {};
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { contactPerson: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      payments: {
        select: {
          id: true,
          amount: true,
          paymentDate: true,
        },
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  return companies.map((c) => {
    const totalReceived = Math.round(
      c.payments.reduce((sum, p) => sum + p.amount, 0) * 100
    ) / 100;
    const lastPaymentDate = c.payments[0]?.paymentDate
      ? c.payments[0].paymentDate.toISOString()
      : null;

    return {
      id: c.id,
      name: c.name,
      contactPerson: c.contactPerson,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      totalReceived,
      paymentsCount: c.payments.length,
      lastPaymentDate,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

export async function getCompanyById(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { paymentDate: "desc" },
        include: {
          recordedBy: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!company) return null;

  const totalReceived = Math.round(
    company.payments.reduce((sum, p) => sum + p.amount, 0) * 100
  ) / 100;

  return {
    id: company.id,
    name: company.name,
    contactPerson: company.contactPerson,
    phone: company.phone,
    email: company.email,
    address: company.address,
    notes: company.notes,
    totalReceived,
    paymentsCount: company.payments.length,
    lastPaymentDate: company.payments[0]?.paymentDate
      ? company.payments[0].paymentDate.toISOString()
      : null,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    payments: company.payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      companyId: p.companyId,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate.toISOString(),
      referenceNumber: p.referenceNumber,
      purpose: p.purpose,
      notes: p.notes,
      recordedById: p.recordedById,
      recordedBy: p.recordedBy,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

export async function createCompany(data: CreateCompanyInput, userId?: string, userName?: string) {
  const trimmedName = data.name.trim();
  if (!trimmedName) throw new Error("Company name is required");

  const existing = await prisma.company.findUnique({
    where: { name: trimmedName },
  });
  if (existing) {
    throw new Error(`A company with name "${trimmedName}" already exists`);
  }

  const company = await prisma.company.create({
    data: {
      name: trimmedName,
      contactPerson: data.contactPerson?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  if (userId && userName) {
    await logAuditEvent({
      userId,
      userName,
      action: "COMPANY_CREATED",
      entity: "Company",
      entityId: company.id,
      metadata: { name: company.name },
    });
  }

  return company;
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyInput,
  userId?: string,
  userName?: string
) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw new Error("Company not found");

  if (data.name && data.name.trim() !== existing.name) {
    const duplicate = await prisma.company.findUnique({
      where: { name: data.name.trim() },
    });
    if (duplicate && duplicate.id !== id) {
      throw new Error(`A company with name "${data.name.trim()}" already exists`);
    }
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson?.trim() || null : undefined,
      phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
      email: data.email !== undefined ? data.email?.trim() || null : undefined,
      address: data.address !== undefined ? data.address?.trim() || null : undefined,
      notes: data.notes !== undefined ? data.notes?.trim() || null : undefined,
    },
  });

  if (userId && userName) {
    await logAuditEvent({
      userId,
      userName,
      action: "COMPANY_UPDATED",
      entity: "Company",
      entityId: id,
      metadata: { name: updated.name },
    });
  }

  return updated;
}

export async function deleteCompany(id: string, userId: string, userName: string) {
  const existing = await prisma.company.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!existing) throw new Error("Company not found");

  await prisma.company.delete({ where: { id } });

  await logAuditEvent({
    userId,
    userName,
    action: "COMPANY_DELETED",
    entity: "Company",
    entityId: id,
    metadata: {
      name: existing.name,
      paymentsCount: existing.payments.length,
    },
  });

  invalidateDashboardMetricsCache();
  return { success: true };
}

export async function getAllCompanyPayments(filters?: {
  companyId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};
  if (filters?.companyId) where.companyId = filters.companyId;
  if (filters?.paymentMethod) where.paymentMethod = filters.paymentMethod;

  if (filters?.startDate || filters?.endDate) {
    where.paymentDate = {};
    if (filters.startDate) where.paymentDate.gte = filters.startDate;
    if (filters.endDate) where.paymentDate.lte = filters.endDate;
  }

  const payments = await prisma.companyPayment.findMany({
    where,
    orderBy: { paymentDate: "desc" },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          contactPerson: true,
          phone: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    receiptNumber: p.receiptNumber,
    companyId: p.companyId,
    company: p.company,
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    paymentDate: p.paymentDate.toISOString(),
    referenceNumber: p.referenceNumber,
    purpose: p.purpose,
    notes: p.notes,
    recordedById: p.recordedById,
    recordedBy: p.recordedBy,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function recordCompanyPayment(
  data: RecordCompanyPaymentInput,
  userId: string,
  userName: string
) {
  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  let companyId = data.companyId;

  // If no companyId but companyName is supplied, find or auto-create company
  if (!companyId) {
    if (!data.companyName || !data.companyName.trim()) {
      throw new Error("Company name or existing company is required");
    }
    const name = data.companyName.trim();
    let comp = await prisma.company.findUnique({ where: { name } });
    if (!comp) {
      comp = await prisma.company.create({
        data: {
          name,
          contactPerson: data.contactPerson?.trim() || null,
          phone: data.phone?.trim() || null,
        },
      });
    }
    companyId = comp.id;
  }

  const receiptNumber = await generateCompanyReceiptNumber();

  const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

  const payment = await prisma.companyPayment.create({
    data: {
      receiptNumber,
      companyId,
      amount: Math.round(amount * 100) / 100,
      paymentMethod: data.paymentMethod || "CASH",
      paymentDate,
      referenceNumber: data.referenceNumber?.trim() || null,
      purpose: data.purpose?.trim() || "Corporate Payment",
      notes: data.notes?.trim() || null,
      recordedById: userId,
    },
    include: {
      company: {
        select: { id: true, name: true, contactPerson: true, phone: true },
      },
      recordedBy: {
        select: { id: true, name: true },
      },
    },
  });

  await logAuditEvent({
    userId,
    userName,
    action: "COMPANY_PAYMENT_RECORDED",
    entity: "CompanyPayment",
    entityId: payment.id,
    metadata: {
      receiptNumber,
      companyName: payment.company?.name,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
    },
  });

  invalidateDashboardMetricsCache();

  return {
    ...payment,
    paymentDate: payment.paymentDate.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function deleteCompanyPayment(
  paymentId: string,
  userId: string,
  userName: string
) {
  const existing = await prisma.companyPayment.findUnique({
    where: { id: paymentId },
    include: { company: true },
  });
  if (!existing) throw new Error("Payment record not found");

  await prisma.companyPayment.delete({ where: { id: paymentId } });

  await logAuditEvent({
    userId,
    userName,
    action: "COMPANY_PAYMENT_DELETED",
    entity: "CompanyPayment",
    entityId: paymentId,
    metadata: {
      receiptNumber: existing.receiptNumber,
      companyName: existing.company?.name,
      amount: existing.amount,
    },
  });

  invalidateDashboardMetricsCache();
  return { success: true };
}
