import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, canViewCredits, canCreateCreditBill } from "@/server/auth/rbac";
import { getCreditBills, createCreditPurchase } from "@/server/services/credit.service";
import { createCustomer } from "@/server/services/customer.service";
import prisma from "@/lib/db";

const createItemSchema = z.object({
  serviceItemId: z.string().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  category: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  originalPrice: z.number().optional().nullable(),
  isCustom: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

const createBillSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: z
    .object({
      fullName: z.string().min(2, "Full name must be at least 2 characters"),
      contactNumber: z.string().min(5, "Contact number is required"),
      citizenshipNumber: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
    })
    .optional(),
  items: z.array(createItemSchema).min(1, "At least one item is required"),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  serviceCharge: z.number().min(0).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!canViewCredits(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const customerId = searchParams.get("customerId") || undefined;
    const accountId = searchParams.get("accountId") || undefined;
    const q = searchParams.get("q") || "";
    const take = Number(searchParams.get("take")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const result = await getCreditBills({
      status,
      customerId,
      accountId,
      q,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit bills" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!canCreateCreditBill(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let customerId = parsed.data.customerId;

    // Support creating customer inline if newCustomer passed
    if (!customerId && parsed.data.newCustomer) {
      const existing = await prisma.customer.findFirst({
        where: {
          contactNumber: parsed.data.newCustomer.contactNumber.trim(),
        },
      });

      if (existing) {
        customerId = existing.id;
      } else {
        const created = await createCustomer({
          fullName: parsed.data.newCustomer.fullName.trim(),
          contactNumber: parsed.data.newCustomer.contactNumber.trim(),
          citizenshipNumber: parsed.data.newCustomer.citizenshipNumber?.trim() || null,
          address: parsed.data.newCustomer.address?.trim() || null,
          gender: parsed.data.newCustomer.gender || "PREFER_NOT_TO_SAY",
        });
        customerId = created.id;
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const result = await createCreditPurchase(
      {
        customerId,
        items: parsed.data.items,
        discount: parsed.data.discount,
        tax: parsed.data.tax,
        serviceCharge: parsed.data.serviceCharge,
        dueDate: parsed.data.dueDate,
        notes: parsed.data.notes,
      },
      user.id,
      user.name
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create credit purchase" },
      { status: error.statusCode || 500 }
    );
  }
}
