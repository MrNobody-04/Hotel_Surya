import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { getAllCompanies, createCompany } from "@/server/services/company.service";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const companies = await getAllCompanies(search);
    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch companies" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const company = await createCompany(
      {
        name: body.name,
        contactPerson: body.contactPerson,
        phone: body.phone,
        email: body.email,
        address: body.address,
        notes: body.notes,
      },
      user.id,
      user.name
    );

    return NextResponse.json({ company }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create company" },
      { status: error.statusCode || 400 }
    );
  }
}
