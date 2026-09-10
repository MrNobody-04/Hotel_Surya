import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/rbac";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER"]);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const take = Number(searchParams.get("take")) || 100;
    const skip = Number(searchParams.get("skip")) || 0;

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take,
        skip,
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: error.statusCode || 500 }
    );
  }
}
