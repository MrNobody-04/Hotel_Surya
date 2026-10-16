import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, canViewCredits, canCreateCreditBill } from "@/server/auth/rbac";
import {
  searchCreditAccounts,
  getOrCreateCreditAccount,
} from "@/server/services/credit.service";
import { createCustomer } from "@/server/services/customer.service";
import prisma from "@/lib/db";

const createAccountSchema = z.object({
  customerId: z.string().optional(),
  // Or create inline if new customer
  newCustomer: z
    .object({
      fullName: z.string().min(2, "Full name must be at least 2 characters"),
      contactNumber: z.string().optional().nullable().transform((val) => val?.trim() || "N/A"),
      citizenshipNumber: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!canViewCredits(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "ALL";
    const minBalance = searchParams.get("minBalance")
      ? Number(searchParams.get("minBalance"))
      : undefined;
    const take = Number(searchParams.get("take")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const result = await searchCreditAccounts({
      q,
      status,
      minBalance,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search credit accounts" },
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
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let customerId = parsed.data.customerId;

    // If new customer details provided, check duplicates or create
    if (!customerId && parsed.data.newCustomer) {
      const phone = parsed.data.newCustomer.contactNumber?.trim();
      let existing = null;
      if (phone && phone !== "N/A") {
        existing = await prisma.customer.findFirst({
          where: { contactNumber: phone },
        });
      }

      if (existing) {
        customerId = existing.id;
      } else {
        const created = await createCustomer({
          fullName: parsed.data.newCustomer.fullName.trim(),
          contactNumber: phone || "N/A",
          citizenshipNumber: parsed.data.newCustomer.citizenshipNumber?.trim() || null,
          address: parsed.data.newCustomer.address?.trim() || null,
          gender: parsed.data.newCustomer.gender || "PREFER_NOT_TO_SAY",
        });
        customerId = created.id;
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID or new customer details are required" },
        { status: 400 }
      );
    }

    const account = await getOrCreateCreditAccount(customerId);
    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get or create credit account" },
      { status: error.statusCode || 500 }
    );
  }
}
