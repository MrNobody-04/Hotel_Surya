import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getDashboardMetrics, getDetailedAnalytics } from "@/server/services/analytics.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "dashboard";
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    if (mode === "detailed") {
      const detailed = await getDetailedAnalytics(startDate, endDate);
      return NextResponse.json(detailed);
    } else {
      const dashboard = await getDashboardMetrics();
      return NextResponse.json(dashboard);
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: error.statusCode || 500 }
    );
  }
}
