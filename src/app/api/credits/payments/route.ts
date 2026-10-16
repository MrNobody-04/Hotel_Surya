import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, canViewCredits, canRecordCreditPayment } from "@/server/auth/rbac";
import { getCreditPayments, collectCreditPayment } from "@/server/services/credit.service";

const collectPaymentSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  billId: z.string().optional().nullable(),
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "QR_PAYMENT", "CARD", "OTHER"]),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!canViewCredits(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || undefined;
    const accountId = searchParams.get("accountId") || undefined;
    const billId = searchParams.get("billId") || undefined;
    const take = Number(searchParams.get("take")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const result = await getCreditPayments({
      customerId,
      accountId,
      billId,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit payments" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!canRecordCreditPayment(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = collectPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await collectCreditPayment(
      parsed.data,
      user.id,
      user.name
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record credit payment" },
      { status: error.statusCode || 500 }
    );
  }
}
