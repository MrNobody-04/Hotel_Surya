import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import {
  getDiningTables,
  startDiningOrder,
  createDiningTable,
} from "@/server/services/dining.service";

export async function GET() {
  try {
    await requireAuth();
    const tables = await getDiningTables();
    return NextResponse.json({ tables });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dining tables" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is a request to create a new table/cabin
    if (body.action === "CREATE_TABLE" || (!body.tableId && body.name)) {
      const user = await requireRole(["OWNER", "MANAGER"]);
      const newTable = await createDiningTable(
        {
          name: body.name,
          type: body.type,
          capacity: body.capacity,
          notes: body.notes,
        },
        user.id,
        user.name
      );
      return NextResponse.json({ table: newTable }, { status: 201 });
    }

    const user = await requireAuth();
    const { tableId, customerName, customerPhone, guestCount, notes, items } = body;
    if (!tableId) {
      return NextResponse.json({ error: "Table ID is required" }, { status: 400 });
    }

    const order = await startDiningOrder({
      tableId,
      customerName,
      customerPhone,
      guestCount: Number(guestCount) || 1,
      notes,
      items: items || [],
      userId: user.id,
      userName: user.name,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process dining request" },
      { status: error.statusCode || 400 }
    );
  }
}
