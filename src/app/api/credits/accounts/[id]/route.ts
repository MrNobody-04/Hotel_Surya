import { NextResponse } from "next/server";
import { requireAuth, canViewCredits } from "@/server/auth/rbac";
import { getCreditAccountDetails } from "@/server/services/credit.service";

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
    const account = await getCreditAccountDetails(id);

    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit account details" },
      { status: error.statusCode || 500 }
    );
  }
}
