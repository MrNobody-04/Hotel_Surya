import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getStayById } from "@/server/services/stay.service";

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
