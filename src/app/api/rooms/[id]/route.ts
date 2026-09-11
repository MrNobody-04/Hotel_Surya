import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { getRoomById, updateRoom } from "@/server/services/room.service";
import { logAuditEvent } from "@/server/services/audit.service";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const room = await getRoomById(id);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch room" },
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

    const updated = await updateRoom(id, {
      roomNumber: body.roomNumber,
      type: body.type,
      notes: body.notes,
      status: body.status,
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "ROOM_UPDATED",
      entity: "Room",
      entityId: id,
      metadata: body,
    });

    return NextResponse.json({ room: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update room" },
      { status: error.statusCode || 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER"]);
    const { id } = await params;

    const stayCount = await prisma.stay.count({
      where: { roomId: id },
    });
    if (stayCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a room that has stay records in history. You can mark it as MAINTENANCE instead.",
        },
        { status: 400 }
      );
    }

    const room = await prisma.room.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "ROOM_DELETED",
      entity: "Room",
      entityId: id,
      metadata: { roomNumber: room.roomNumber },
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete room" },
      { status: error.statusCode || 400 }
    );
  }
}

