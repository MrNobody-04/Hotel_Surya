import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const [customers, rooms, stays, expenses] = await Promise.all([
      // Search customers
      prisma.customer.findMany({
        where: {
          OR: [
            { fullName: { contains: query } },
            { contactNumber: { contains: query } },
            { citizenshipNumber: { contains: query } },
          ],
        },
        take: 5,
      }),
      // Search rooms
      prisma.room.findMany({
        where: {
          roomNumber: { contains: query },
        },
        take: 5,
      }),
      // Search active stays
      prisma.stay.findMany({
        where: {
          OR: [
            { customer: { fullName: { contains: query } } },
            { room: { roomNumber: { contains: query } } },
            { id: { contains: query } },
          ],
        },
        include: { customer: true, room: true },
        take: 5,
      }),
      // Search expenses
      prisma.expense.findMany({
        where: {
          title: { contains: query },
        },
        take: 5,
      }),
    ]);

    const formatted = [
      ...customers.map((c) => ({
        type: "customer",
        id: c.id,
        title: c.fullName,
        subtitle: `Phone: ${c.contactNumber} | ${c.citizenshipNumber || "No citizenship"}`,
        url: `/customers?q=${encodeURIComponent(c.fullName)}`,
      })),
      ...rooms.map((r) => ({
        type: "room",
        id: r.id,
        title: `Room ${r.roomNumber}`,
        subtitle: `${r.type} - Status: ${r.status}`,
        url: `/rooms`,
      })),
      ...stays.map((s) => ({
        type: "stay",
        id: s.id,
        title: `Stay #${s.id.slice(0, 8)}: ${s.customer.fullName} in Room ${s.room.roomNumber}`,
        subtitle: `Status: ${s.status} | People: ${s.numberOfPeople}`,
        url: s.status === "ACTIVE" ? `/stays/${s.id}/bill` : `/stays`,
      })),
      ...expenses.map((e) => ({
        type: "expense",
        id: e.id,
        title: e.title,
        subtitle: `NPR ${e.amount.toLocaleString()} - ${e.category}`,
        url: `/expenses`,
      })),
    ];

    return NextResponse.json({ results: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: error.statusCode || 500 }
    );
  }
}
