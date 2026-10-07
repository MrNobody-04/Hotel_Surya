import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { BillItemCategory } from "@/types";
import { logAuditEvent } from "@/server/services/audit.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const item = await prisma.serviceItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch menu item" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.serviceItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const { name, defaultPrice, category, categoryName, isActive } = body;

    const updateData: any = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Item name cannot be empty" }, { status: 400 });
      }
      // Check duplicate name
      if (trimmed !== existing.name) {
        const dup = await prisma.serviceItem.findUnique({
          where: { name: trimmed },
        });
        if (dup && dup.id !== id) {
          return NextResponse.json(
            { error: `An item with name "${trimmed}" already exists` },
            { status: 400 }
          );
        }
      }
      updateData.name = trimmed;
    }

    if (defaultPrice !== undefined) {
      const priceNum = Number(defaultPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json(
          { error: "Price must be a valid positive number" },
          { status: 400 }
        );
      }
      updateData.defaultPrice = priceNum;
    }

    if (category !== undefined) {
      updateData.category = category as BillItemCategory;
    }

    if (categoryName !== undefined) {
      const trimmedCat = categoryName ? String(categoryName).trim() : null;
      updateData.categoryName = trimmedCat;

      if (trimmedCat) {
        await prisma.menuCategory.upsert({
          where: { name: trimmedCat },
          update: {},
          create: {
            name: trimmedCat,
            icon: (updateData.category || existing.category) === "DRINK" ? "🥤" : "🍲",
            sortOrder: 10,
          },
        });
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.serviceItem.update({
      where: { id },
      data: updateData,
    });

    const isPriceChanged =
      defaultPrice !== undefined && Number(defaultPrice) !== existing.defaultPrice;

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: isPriceChanged ? "MENU_PRICE_UPDATED" : "MENU_ITEM_UPDATED",
      entity: "ServiceItem",
      entityId: id,
      metadata: {
        itemName: updated.name,
        previousPrice: existing.defaultPrice,
        newPrice: updated.defaultPrice,
        previousCategory: existing.categoryName,
        newCategory: updated.categoryName,
        active: updated.isActive,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update menu item" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.serviceItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // Soft delete / deactivate so historical orders remain completely intact
    const deactivated = await prisma.serviceItem.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "MENU_ITEM_DEACTIVATED",
      entity: "ServiceItem",
      entityId: id,
      metadata: { name: existing.name, defaultPrice: existing.defaultPrice },
    });

    return NextResponse.json({ success: true, item: deactivated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete menu item" },
      { status: error.statusCode || 500 }
    );
  }
}
