import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { settleDiningOrder } from "@/server/services/dining.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { amount, method, notes } = body;
    if (amount === undefined || !method) {
      return NextResponse.json(
        { error: "Payment amount and method are required" },
        { status: 400 }
      );
    }

    const order = await settleDiningOrder(
      id,
      {
        amount: Number(amount),
        method,
        notes,
      },
      user.id,
      user.name
    );

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to settle order" },
      { status: 400 }
    );
  }
}
