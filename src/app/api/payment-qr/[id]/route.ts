import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import {
  updatePaymentQr,
  deletePaymentQr,
  getPaymentQrById,
} from "@/server/services/payment-qr.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const qr = await getPaymentQrById(id);
    if (!qr) {
      return NextResponse.json({ error: "Payment QR not found" }, { status: 404 });
    }
    return NextResponse.json({ qr });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment QR" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;
    const body = await request.json();

    const qr = await updatePaymentQr(id, body, user.id, user.name);
    return NextResponse.json({ qr });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update payment QR" },
      { status: error.statusCode || 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;

    const result = await deletePaymentQr(id, user.id, user.name);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete payment QR" },
      { status: error.statusCode || 400 }
    );
  }
}
