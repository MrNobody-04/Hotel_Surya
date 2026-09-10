import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import { deleteExpense } from "@/server/services/expense.service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;

    const result = await deleteExpense(id, user.id, user.name);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: error.statusCode || 400 }
    );
  }
}
