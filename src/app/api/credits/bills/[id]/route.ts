import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, canViewCredits, canEditCreditBills } from "@/server/auth/rbac";
import { editCreditBill } from "@/server/services/credit.service";
import prisma from "@/lib/db";

const editBillSchema = z.object({
  items: z
    .array(
      z.object({
        serviceItemId: z.string().optional().nullable(),
        name: z.string().min(1, "Item name is required"),
        category: z.string().optional().nullable(),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        unitPrice: z.number().min(0, "Unit price cannot be negative"),
        originalPrice: z.number().optional().nullable(),
        isCustom: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .min(1, "At least one item is required"),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  serviceCharge: z.number().min(0).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});

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

    const bill = await prisma.creditBill.findUnique({
      where: { id },
      include: {
        customer: true,
        account: true,
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
        adjustments: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Credit bill not found" }, { status: 404 });
    }

    return NextResponse.json({
      bill: {
        ...bill,
        remainingAmount: Math.max(0, Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit bill" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!canEditCreditBills(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Owner and Manager can edit saved credit bills" },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const body = await request.json();

    const parsed = editBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await editCreditBill(
      id,
      parsed.data,
      user.id,
      user.name,
      user.role
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to edit credit bill" },
      { status: error.statusCode || 500 }
    );
  }
}
