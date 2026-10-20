import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/server/auth/rbac";
import { getCompanyById, updateCompany, deleteCompany } from "@/server/services/company.service";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await props.params;

    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch company" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await props.params;
    const body = await request.json();

    const updated = await updateCompany(id, body, user.id, user.name);
    return NextResponse.json({ company: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update company" },
      { status: error.statusCode || 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);
    const { id } = await props.params;

    await deleteCompany(id, user.id, user.name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete company" },
      { status: error.statusCode || 400 }
    );
  }
}
