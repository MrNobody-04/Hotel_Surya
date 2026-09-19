import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getStayById, deleteStay, updateStayRoomPrice } from "@/server/services/stay.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const stay = await getStayById(id);
    if (!stay) {
      return NextResponse.json({ error: "Stay not found" }, { status: 404 });
    }

    return NextResponse.json({ stay });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stay" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (body.roomPrice === undefined) {
      return NextResponse.json(
        { error: "roomPrice is required" },
        { status: 400 }
      );
    }

    const updatedStay = await updateStayRoomPrice({
      stayId: id,
      roomPrice: Number(body.roomPrice),
      notes: body.notes,
      userId: user.id,
      userName: user.name,
    });

    return NextResponse.json({ success: true, stay: updatedStay });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update room price" },
      { status: error.statusCode || 400 }
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
    const url = new URL(request.url);
    const deleteCustomer = url.searchParams.get("deleteCustomer") === "true";

    const result = await deleteStay(id, user.id, user.name, deleteCustomer);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete stay" },
      { status: error.statusCode || 400 }
    );
  }
}

