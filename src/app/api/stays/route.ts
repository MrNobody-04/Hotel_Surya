import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import { getActiveStays, getHistoricalStays } from "@/server/services/stay.service";
import { getNepalDateRange } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE";
    const roomId = searchParams.get("roomId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const period = searchParams.get("period");
    let startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    let endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    if (period && !startDate && !endDate) {
      const range = getNepalDateRange(period);
      if (range) {
        startDate = range.startDate;
        endDate = range.endDate;
      }
    }
    const take = Number(searchParams.get("take")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    if (status === "ACTIVE") {
      const activeStays = await getActiveStays();
      return NextResponse.json({ stays: activeStays, total: activeStays.length });
    } else {
      const result = await getHistoricalStays({
        roomId,
        customerId,
        startDate,
        endDate,
        take,
        skip,
      });
      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stays" },
      { status: error.statusCode || 500 }
    );
  }
}
