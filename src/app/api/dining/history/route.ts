import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getDiningOrderHistory } from "@/server/services/dining.service";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const data = await getDiningOrderHistory(limit, skip);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch dining history" },
      { status: error.statusCode || 500 }
    );
  }
}
