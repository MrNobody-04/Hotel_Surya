import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import {
  deleteDiningTable,
  updateDiningTable,
} from "@/server/services/dining.service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;
    const result = await deleteDiningTable(id, user.id, user.name);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete dining table" },
      { status: error.statusCode || 400 }
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
    const updated = await updateDiningTable(id, body, user.id, user.name);
    return NextResponse.json({ table: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update dining table" },
      { status: error.statusCode || 400 }
    );
  }
}
