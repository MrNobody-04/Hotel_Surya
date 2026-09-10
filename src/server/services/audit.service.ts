import prisma from "@/lib/db";

export interface LogAuditInput {
  userId?: string | null;
  userName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
}

export async function logAuditEvent(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        userName: input.userName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress || null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Audit log failure must not crash the primary operational transaction, but should be logged to stderr
    console.error("Failed to write audit log:", error);
  }
}
