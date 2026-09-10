import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/rbac";
import { addBillItem } from "@/server/services/stay.service";

const itemSchema = z.object({
  category: z.enum(["FOOD", "DRINK", "SERVICE", "OTHER"]),
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  notes: z.string().optional().nullable(),
});

const batchSchema = z.object({
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Support batch adding multiple items at once
    if (body.items && Array.isArray(body.items)) {
      const parsed = batchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const createdItems = [];
      for (const itemData of parsed.data.items) {
        const item = await addBillItem({
          stayId: id,
          ...itemData,
          userId: user.id,
          userName: user.name,
        });
        createdItems.push(item);
      }

      return NextResponse.json({ success: true, items: createdItems });
    }

    // Single item fallback for backward compatibility
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const item = await addBillItem({
      stayId: id,
      ...parsed.data,
      userId: user.id,
      userName: user.name,
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add bill item" },
      { status: 400 }
    );
  }
}
