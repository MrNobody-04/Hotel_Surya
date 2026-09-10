import prisma from "@/lib/db";
import { ExpenseCategory, PaymentMethod } from "@/types";
import { logAuditEvent } from "./audit.service";

export interface CreateExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date?: Date | string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  receiptUrl?: string | null;
  userId: string;
  userName: string;
}

export async function createExpense(input: CreateExpenseInput) {
  const amount = Number(input.amount);
  if (amount <= 0) throw new Error("Expense amount must be greater than zero");

  const expense = await prisma.expense.create({
    data: {
      title: input.title.trim(),
      amount,
      category: input.category,
      date: input.date ? new Date(input.date) : new Date(),
      paymentMethod: input.paymentMethod,
      notes: input.notes?.trim() || null,
      receiptUrl: input.receiptUrl || null,
      createdById: input.userId,
    },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  await logAuditEvent({
    userId: input.userId,
    userName: input.userName,
    action: "EXPENSE_CREATED",
    entity: "Expense",
    entityId: expense.id,
    metadata: {
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
    },
  });

  return expense;
}

export async function getExpenses(filters?: {
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
  paymentMethod?: PaymentMethod;
  take?: number;
  skip?: number;
}) {
  const where: any = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  const [expenses, total, sumResult] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: filters?.take || 50,
      skip: filters?.skip || 0,
      include: {
        createdBy: { select: { name: true } },
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    expenses,
    total,
    totalAmount: sumResult._sum.amount || 0,
  };
}

export async function deleteExpense(id: string, userId: string, userName: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new Error("Expense not found");

  await prisma.expense.delete({ where: { id } });

  await logAuditEvent({
    userId,
    userName,
    action: "EXPENSE_DELETED",
    entity: "Expense",
    entityId: id,
    metadata: { title: expense.title, amount: expense.amount },
  });

  return { success: true };
}
