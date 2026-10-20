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

    const activeStayCount = await prisma.stay.count({
      where: { roomId: id, status: "ACTIVE" },
    });
    if (activeStayCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a room that currently has an active guest. Please check out the guest first.",
        },
        { status: 400 }
      );
    }

    const totalStays = await prisma.stay.count({
      where: { roomId: id },
    });

    let room;
    if (totalStays > 0) {
      // Soft-delete to preserve all historical stay records, bills, payments & accounting integrity
      room = await prisma.room.update({
        where: { id },
        data: { isArchived: true, status: "MAINTENANCE" },
      });
    } else {
      // Hard delete if never used
      room = await prisma.room.delete({
        where: { id },
      });
    }

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "ROOM_DELETED",
      entity: "Room",
      entityId: id,
      metadata: { roomNumber: room.roomNumber, archived: totalStays > 0 },
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete room" },
      { status: error.statusCode || 400 }
    );
  }
}

