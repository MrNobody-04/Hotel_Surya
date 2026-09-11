import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getDiningTables, startDiningOrder } from "@/server/services/dining.service";

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
    const user = await requireAuth();
    const body = await request.json();

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
      { error: error.message || "Failed to start dining order" },
      { status: 400 }
    );
  }
}
