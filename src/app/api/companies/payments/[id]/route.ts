import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { deleteCompanyPayment } from "@/server/services/company.service";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await props.params;

    await deleteCompanyPayment(id, user.id, user.name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete company payment" },
      { status: error.statusCode || 400 }
    );
  }
}
