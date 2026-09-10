import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/rbac";
import { searchCustomers, createCustomer } from "@/server/services/customer.service";
import { logAuditEvent } from "@/server/services/audit.service";

const customerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  contactNumber: z.string().min(5, "Contact number is required"),
  citizenshipNumber: z.string().optional().nullable(),
  citizenshipPhotoUrl: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const take = Number(searchParams.get("take")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const result = await searchCustomers(query, take, skip);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search customers" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const customer = await createCustomer(parsed.data as any);

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "CUSTOMER_CREATED",
      entity: "Customer",
      entityId: customer.id,
      metadata: { fullName: customer.fullName, contactNumber: customer.contactNumber },
    });

    return NextResponse.json({ customer });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create customer" },
      { status: error.statusCode || 500 }
    );
  }
}
