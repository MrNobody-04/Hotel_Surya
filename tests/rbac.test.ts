import { describe, it, expect } from "vitest";
import {
  canManageStaff,
  canViewAuditLogs,
  canDeleteExpenses,
  canViewFinancialAnalytics,
} from "../src/server/auth/rbac";

describe("Role-Based Access Control (RBAC) Rules", () => {
  it("restricts staff management strictly to OWNER", () => {
    expect(canManageStaff("OWNER")).toBe(true);
    expect(canManageStaff("MANAGER")).toBe(false);
    expect(canManageStaff("RECEPTIONIST")).toBe(false);
  });

  it("permits audit log viewing to OWNER and MANAGER only", () => {
    expect(canViewAuditLogs("OWNER")).toBe(true);
    expect(canViewAuditLogs("MANAGER")).toBe(true);
    expect(canViewAuditLogs("RECEPTIONIST")).toBe(false);
  });

  it("permits expense deletion to OWNER and MANAGER only", () => {
    expect(canDeleteExpenses("OWNER")).toBe(true);
    expect(canDeleteExpenses("MANAGER")).toBe(true);
    expect(canDeleteExpenses("RECEPTIONIST")).toBe(false);
  });

  it("permits financial analytics to OWNER and MANAGER only", () => {
    expect(canViewFinancialAnalytics("OWNER")).toBe(true);
    expect(canViewFinancialAnalytics("MANAGER")).toBe(true);
    expect(canViewFinancialAnalytics("RECEPTIONIST")).toBe(false);
  });
});
