import { NextResponse } from "next/server";
import { requireAuth, canCreateCreditBill } from "@/server/auth/rbac";
import { addItemsToExistingCreditBill } from "@/server/services/credit.service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!canCreateCreditBill(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to add credit items" },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const body = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required to add to bill" },
        { status: 400 }
      );
    }

    const result = await addItemsToExistingCreditBill(
      id,
      body.items,
      user.id,
      user.name
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add items to credit bill" },
      { status: error.statusCode || 400 }
    );
  }
}
