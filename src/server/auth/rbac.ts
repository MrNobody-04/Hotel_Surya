import { Role, SessionUser } from "@/types";
import { getSessionUser } from "./session";
import prisma from "@/lib/db";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Require an authenticated active user
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    throw new AuthError("Authentication required", 401);
  }

  // Verify in database that user exists and is still active
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new AuthError("User account is inactive or no longer exists", 403);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
}

/**
 * Require user to possess one of the allowed roles
 */
export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError("Forbidden: Insufficient permissions for this action", 403);
  }
  return user;
}

export function canManageStaff(role: Role): boolean {
  return role === "OWNER";
}

export function canViewAuditLogs(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canDeleteExpenses(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export function canViewFinancialAnalytics(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER";
}
