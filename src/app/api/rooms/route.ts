import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { getAllRooms } from "@/server/services/room.service";
import prisma from "@/lib/db";
import { logAuditEvent } from "@/server/services/audit.service";
import { RoomStatus, RoomType } from "@/types";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as RoomType | null;
    const status = searchParams.get("status") as RoomStatus | null;

    const rooms = await getAllRooms({
      type: type || undefined,
      status: status || undefined,
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch rooms" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const body = await request.json();

    const { roomNumber, type, notes } = body;
    if (!roomNumber) {
      return NextResponse.json({ error: "Room number is required" }, { status: 400 });
    }

    const existing = await prisma.room.findUnique({
      where: { roomNumber: String(roomNumber).trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "Room number already exists" }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: String(roomNumber).trim(),
        type: type || "NON_AC",
        status: "AVAILABLE",
        notes: notes?.trim() || null,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "ROOM_CREATED",
      entity: "Room",
      entityId: room.id,
      metadata: { roomNumber: room.roomNumber, type: room.type },
    });

    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create room" },
      { status: error.statusCode || 500 }
    );
  }
}
