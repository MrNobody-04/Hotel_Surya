import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/rbac";
import { getExpenses, createExpense } from "@/server/services/expense.service";
import { ExpenseCategory, PaymentMethod } from "@/types";

const expenseSchema = z.object({
  title: z.string().min(2, "Title is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.enum([
    "SALARY",
    "FOOD_PURCHASE",
    "ELECTRICITY",
    "WATER",
    "INTERNET",
    "GAS",
    "MAINTENANCE",
    "CLEANING",
    "SUPPLIES",
    "TRANSPORTATION",
    "RENT",
    "REPAIRS",
    "MARKETING",
    "OTHER",
  ]),
  date: z.string().optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "QR_PAYMENT", "CARD", "OTHER"]),
  notes: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as ExpenseCategory | null;
    const paymentMethod = searchParams.get("paymentMethod") as PaymentMethod | null;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const take = Number(searchParams.get("take")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const result = await getExpenses({
      category: category || undefined,
      paymentMethod: paymentMethod || undefined,
      startDate,
      endDate,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch expenses" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const expense = await createExpense({
      ...parsed.data,
      userId: user.id,
      userName: user.name,
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create expense" },
      { status: 400 }
    );
  }
}
