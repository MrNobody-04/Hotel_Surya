import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { getAllCompanyPayments, recordCompanyPayment } from "@/server/services/company.service";
import { PaymentMethod } from "@/types";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || undefined;
    const paymentMethod = (searchParams.get("paymentMethod") as PaymentMethod) || undefined;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const payments = await getAllCompanyPayments({
      companyId,
      paymentMethod,
      startDate,
      endDate,
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch company payments" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const body = await request.json();

    const payment = await recordCompanyPayment(
      {
        companyId: body.companyId,
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        phone: body.phone,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        paymentDate: body.paymentDate,
        referenceNumber: body.referenceNumber,
        purpose: body.purpose,
        notes: body.notes,
      },
      user.id,
      user.name
    );

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record company payment" },
      { status: error.statusCode || 400 }
    );
  }
}
