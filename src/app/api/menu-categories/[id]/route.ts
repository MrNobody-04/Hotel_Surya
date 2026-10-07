import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { logAuditEvent } from "@/server/services/audit.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.menuCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { name, icon, sortOrder } = body;
    const updateData: any = {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
      }

      if (trimmedName !== existing.name) {
        const dup = await prisma.menuCategory.findUnique({
          where: { name: trimmedName },
        });
        if (dup && dup.id !== id) {
          return NextResponse.json(
            { error: `Category "${trimmedName}" already exists` },
            { status: 400 }
          );
        }

        // Update all ServiceItems that were in this category to use new category name
        await prisma.serviceItem.updateMany({
          where: { categoryName: existing.name },
          data: { categoryName: trimmedName },
        });
      }

      updateData.name = trimmedName;
    }

    if (icon !== undefined) {
      updateData.icon = icon ? String(icon).trim() : null;
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder);
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "MENU_CATEGORY_UPDATED",
      entity: "MenuCategory",
      entityId: id,
      metadata: { previousName: existing.name, newName: updated.name },
    });

    return NextResponse.json({ category: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
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

    const existing = await prisma.menuCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // When deleting a category, reassign items to "Food" or "Drinks" so they are not lost
    const isDrinkCat = existing.name.toLowerCase().includes("drink") || existing.name.toLowerCase().includes("beer");
    const fallbackCategory = isDrinkCat ? "Drinks" : "Food";

    await prisma.serviceItem.updateMany({
      where: { categoryName: existing.name },
      data: { categoryName: fallbackCategory },
    });

    await prisma.menuCategory.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "MENU_CATEGORY_DELETED",
      entity: "MenuCategory",
      entityId: id,
      metadata: { deletedCategory: existing.name, fallbackReassignedTo: fallbackCategory },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: error.statusCode || 500 }
    );
  }
}
