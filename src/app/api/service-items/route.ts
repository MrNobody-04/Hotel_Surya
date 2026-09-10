import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { BillItemCategory } from "@/types";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as BillItemCategory | null;

    const where: any = { isActive: true };
    if (category) where.category = category;

    const items = await prisma.serviceItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch service items" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const body = await request.json();

    const { name, category, defaultPrice } = body;
    if (!name || defaultPrice === undefined) {
      return NextResponse.json(
        { error: "Name and default price are required" },
        { status: 400 }
      );
    }

    const item = await prisma.serviceItem.create({
      data: {
        name: String(name).trim(),
        category: category || "OTHER",
        defaultPrice: Number(defaultPrice),
        isActive: true,
      },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create catalog item" },
      { status: 400 }
    );
  }
}
