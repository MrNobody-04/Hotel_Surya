import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { logAuditEvent } from "@/server/services/audit.service";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const categories = await prisma.menuCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Also get item count for each category
    const itemCounts = await prisma.serviceItem.groupBy({
      by: ["categoryName"],
      where: { isActive: true },
      _count: { id: true },
    });

    const countMap: Record<string, number> = {};
    for (const row of itemCounts) {
      if (row.categoryName) {
        countMap[row.categoryName] = row._count.id;
      }
    }

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      itemCount: countMap[cat.name] || 0,
    }));

    return NextResponse.json({ categories: categoriesWithCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch menu categories" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { name, icon, sortOrder } = body;
    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim();

    // Check if category name already exists
    const existing = await prisma.menuCategory.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category "${trimmedName}" already exists` },
        { status: 400 }
      );
    }

    // Determine max sortOrder if not provided
    let order = sortOrder !== undefined ? Number(sortOrder) : 10;
    if (sortOrder === undefined) {
      const maxOrder = await prisma.menuCategory.aggregate({
        _max: { sortOrder: true },
      });
      order = (maxOrder._max.sortOrder || 0) + 1;
    }

    const category = await prisma.menuCategory.create({
      data: {
        name: trimmedName,
        icon: icon ? String(icon).trim() : "🍽️",
        sortOrder: order,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "MENU_CATEGORY_CREATED",
      entity: "MenuCategory",
      entityId: category.id,
      metadata: { name: category.name, icon: category.icon },
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create menu category" },
      { status: 400 }
    );
  }
}
