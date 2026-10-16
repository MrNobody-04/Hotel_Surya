import { NextResponse } from "next/server";
import { requireAuth, canViewCredits } from "@/server/auth/rbac";
import { getCreditLedger } from "@/server/services/credit.service";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!canViewCredits(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const take = Number(searchParams.get("take")) || 100;
    const skip = Number(searchParams.get("skip")) || 0;

    const result = await getCreditLedger(id, take, skip);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit ledger" },
      { status: error.statusCode || 500 }
    );
  }
}
