import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { BillItemCategory } from "@/types";
import { logAuditEvent } from "@/server/services/audit.service";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as BillItemCategory | null;
    const categoryName = searchParams.get("categoryName");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (category) where.category = category;
    if (categoryName && categoryName !== "ALL") where.categoryName = categoryName;

    const items = await prisma.serviceItem.findMany({
      where,
      orderBy: [{ categoryName: "asc" }, { name: "asc" }],
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
    const user = await requireAuth();
    const body = await request.json();

    const { name, category, categoryName, defaultPrice } = body;
    if (!name || defaultPrice === undefined || isNaN(Number(defaultPrice))) {
      return NextResponse.json(
        { error: "Name and a valid default price are required" },
        { status: 400 }
      );
    }

    const price = Math.max(0, Number(defaultPrice));
    const trimmedName = String(name).trim();
    const trimmedCatName = categoryName ? String(categoryName).trim() : null;

    // Determine category enum (FOOD, DRINK, SERVICE, OTHER)
    let itemCategory: BillItemCategory = category || "FOOD";
    if (!category && trimmedCatName) {
      const lower = trimmedCatName.toLowerCase();
      if (
        lower.includes("drink") ||
        lower.includes("beer") ||
        lower.includes("beverage") ||
        lower.includes("juice") ||
        lower.includes("tea") ||
        lower.includes("coffee")
      ) {
        itemCategory = "DRINK";
      } else {
        itemCategory = "FOOD";
      }
    }

    // Check if name already exists
    const existing = await prisma.serviceItem.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      if (!existing.isActive) {
        // Re-activate previously deactivated item with updated info
        const updated = await prisma.serviceItem.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            defaultPrice: price,
            category: itemCategory,
            categoryName: trimmedCatName || existing.categoryName || (itemCategory === "DRINK" ? "Drinks" : "Food"),
          },
        });

        await logAuditEvent({
          userId: user.id,
          userName: user.name,
          action: "MENU_ITEM_REACTIVATED",
          entity: "ServiceItem",
          entityId: updated.id,
          metadata: { name: updated.name, price: updated.defaultPrice, category: updated.categoryName },
        });

        return NextResponse.json({ item: updated });
      }

      return NextResponse.json(
        { error: `An item with the name "${trimmedName}" already exists on the menu` },
        { status: 400 }
      );
    }

    // Ensure category exists in MenuCategory if provided
    if (trimmedCatName) {
      await prisma.menuCategory.upsert({
        where: { name: trimmedCatName },
        update: {},
        create: {
          name: trimmedCatName,
          icon: itemCategory === "DRINK" ? "🥤" : "🍲",
          sortOrder: 10,
        },
      });
    }

    const item = await prisma.serviceItem.create({
      data: {
        name: trimmedName,
        category: itemCategory,
        categoryName: trimmedCatName || (itemCategory === "DRINK" ? "Drinks" : "Food"),
        defaultPrice: price,
        isActive: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "MENU_ITEM_CREATED",
      entity: "ServiceItem",
      entityId: item.id,
      metadata: { name: item.name, price: item.defaultPrice, category: item.categoryName },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create menu item" },
      { status: 400 }
    );
  }
}
