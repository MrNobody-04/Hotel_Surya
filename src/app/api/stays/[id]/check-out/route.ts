import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/rbac";
import { checkOut } from "@/server/services/stay.service";

const checkoutSchema = z.object({
  finalPayment: z
    .object({
      amount: z.number().min(0),
      method: z.enum(["CASH", "BANK_TRANSFER", "QR_PAYMENT", "CARD", "OTHER"]),
      notes: z.string().optional(),
    })
    .optional()
    .nullable(),
  adminOverrideReason: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await checkOut({
      stayId: id,
      finalPayment: parsed.data.finalPayment,
      adminOverrideReason: parsed.data.adminOverrideReason,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process checkout" },
      { status: 400 }
    );
  }
}
