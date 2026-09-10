import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireRole } from "@/server/auth/rbac";
import prisma from "@/lib/db";
import { logAuditEvent } from "@/server/services/audit.service";

const createStaffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST"]),
});

export async function GET() {
  try {
    await requireRole(["OWNER", "MANAGER"]);

    const staff = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch staff" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["OWNER"]);
    const body = await request.json();

    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: role as any,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: "STAFF_CREATED",
      entity: "User",
      entityId: newStaff.id,
      metadata: { name: newStaff.name, email: newStaff.email, role: newStaff.role },
    });

    return NextResponse.json({ staff: newStaff });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create staff" },
      { status: error.statusCode || 500 }
    );
  }
}
