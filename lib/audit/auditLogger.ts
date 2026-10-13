import prisma from "@/lib/db";

export type AuditActionType =
  | "VERIFY_USER"
  | "REMOVE_VERIFICATION"
  | "BLOCK_USER"
  | "UNBLOCK_USER"
  | "UPDATE_LIMITS"
  | "UPDATE_SYSTEM_SETTINGS"
  | "UPDATE_EMPLOYEE_PERMISSIONS"
  | "DELETE_MESSAGE"
  | "CLEAR_CONVERSATION"
  | "DOWNLOAD_AUDIT_LOG";

export interface LogAuditOptions {
  actorId: string;
  actorEmail: string;
  action: AuditActionType;
  targetType: "USER" | "CONVERSATION" | "MESSAGE" | "SYSTEM" | "EMPLOYEE";
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditAction(options: LogAuditOptions) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: options.actorId,
        actorEmail: options.actorEmail,
        action: options.action,
        targetType: options.targetType,
        targetId: options.targetId,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        ipAddress: options.ipAddress || "127.0.0.1",
      },
    });
  } catch (err) {
    console.error("[AuditLog Error]", err);
    return null;
  }
}
