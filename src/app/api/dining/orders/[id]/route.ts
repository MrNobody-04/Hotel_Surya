import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import {
  getDiningOrderById,
  deleteDiningOrder,
  cancelDiningOrder,
} from "@/server/services/dining.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const order = await getDiningOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dining order" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "delete"; // delete or cancel
    const reason = searchParams.get("reason") || "Cancelled by staff";

    if (mode === "cancel") {
      const order = await cancelDiningOrder(id, reason, user.id, user.name);
      return NextResponse.json({ success: true, order });
    } else {
      const result = await deleteDiningOrder(id, user.id, user.name);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete/cancel dining order" },
      { status: 400 }
    );
  }
}
