import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import {
  addItemsToDiningOrder,
  removeDiningOrderItem,
} from "@/server/services/dining.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const items = body.items || [body];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    const updated = await addItemsToDiningOrder(id, items, user.id, user.name);
    return NextResponse.json({ order: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add items to order" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const updated = await removeDiningOrderItem(id, itemId, user.id, user.name);
    return NextResponse.json({ order: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove item" },
      { status: 400 }
    );
  }
}
