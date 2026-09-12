import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { getPaymentQrs, createPaymentQr } from "@/server/services/payment-qr.service";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "true";
    const qrs = await getPaymentQrs(includeAll);
    return NextResponse.json({ qrs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment QR codes" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const body = await request.json();

    const qr = await createPaymentQr(
      {
        bankName: body.bankName,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
        qrImageUrl: body.qrImageUrl,
        isDefault: Boolean(body.isDefault),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        notes: body.notes,
      },
      user.id,
      user.name
    );

    return NextResponse.json({ qr }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create payment QR" },
      { status: error.statusCode || 400 }
    );
  }
}
