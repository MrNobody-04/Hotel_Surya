import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/rbac";
import { addPayment } from "@/server/services/stay.service";

const paymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
  method: z.enum(["CASH", "BANK_TRANSFER", "QR_PAYMENT", "CARD", "OTHER"]),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const payment = await addPayment({
      stayId: id,
      ...parsed.data,
      userId: user.id,
      userName: user.name,
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: 400 }
    );
  }
}
