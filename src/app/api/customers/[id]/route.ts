import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getCustomerById, updateCustomer } from "@/server/services/customer.service";
import { logAuditEvent } from "@/server/services/audit.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const customer = await getCustomerById(id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch customer" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const updated = await updateCustomer(id, body);

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "CUSTOMER_UPDATED",
      entity: "Customer",
      entityId: id,
      metadata: body,
    });

    return NextResponse.json({ customer: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update customer" },
      { status: error.statusCode || 400 }
    );
  }
}
