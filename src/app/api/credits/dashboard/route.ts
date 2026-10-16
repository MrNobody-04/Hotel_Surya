import { NextResponse } from "next/server";
import { requireAuth, canViewCredits } from "@/server/auth/rbac";
import { getCreditDashboardMetrics } from "@/server/services/credit.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!canViewCredits(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const metrics = await getCreditDashboardMetrics({ startDate, endDate });
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit dashboard metrics" },
      { status: error.statusCode || 500 }
    );
  }
}
