import { NextResponse } from "next/server";
import { clearSession, getSessionUser } from "@/server/auth/session";
import { logAuditEvent } from "@/server/services/audit.service";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: "LOGOUT",
        entity: "Session",
      });
    }

    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
