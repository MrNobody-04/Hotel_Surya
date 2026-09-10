import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/rbac";
import { checkIn } from "@/server/services/stay.service";

const checkInSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: z
    .object({
      fullName: z.string().min(2, "Customer full name is required"),
      gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
      contactNumber: z.string().min(5, "Contact number is required"),
      citizenshipNumber: z.string().optional().nullable(),
      citizenshipPhotoUrl: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
    .optional(),
  roomId: z.string().min(1, "Room is required"),
  numberOfPeople: z.number().int().min(1, "At least 1 person required"),
  expectedCheckoutDate: z.string().min(1, "Expected checkout date is required"),
  roomPrice: z.number().min(0, "Room price cannot be negative"),
  accompanyingGuests: z
    .array(
      z.object({
        fullName: z.string().min(1),
        gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
      })
    )
    .optional(),
  notes: z.string().optional().nullable(),
  prepayment: z
    .object({
      amount: z.number().min(0),
      method: z.enum(["CASH", "BANK_TRANSFER", "QR_PAYMENT", "CARD", "OTHER"]),
      notes: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (!parsed.data.customerId && !parsed.data.newCustomer) {
      return NextResponse.json(
        { error: "Must select an existing customer or provide new customer details" },
        { status: 400 }
      );
    }

    const stay = await checkIn({
      ...parsed.data,
      userId: user.id,
      userName: user.name,
    });

    return NextResponse.json({ success: true, stay });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process check-in" },
      { status: 400 }
    );
  }
}
