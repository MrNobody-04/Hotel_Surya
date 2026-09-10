import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { logAuditEvent } from "@/server/services/audit.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER"]);
    const { id } = await params;
    const body = await request.json();

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Protect self-deactivation
    if (user.id === id && body.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name.trim();
    if (body.role) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "STAFF_UPDATED",
      entity: "User",
      entityId: id,
      metadata: { changes: Object.keys(updateData) },
    });

    return NextResponse.json({ staff: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update staff" },
      { status: error.statusCode || 400 }
    );
  }
}
