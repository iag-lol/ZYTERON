import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logPortalAdminAction(input: {
  actorId?: string | null;
  targetUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.clientAuditLog.create({
      data: {
        actorId: input.actorId || null,
        targetUserId: input.targetUserId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        details: input.details,
      },
    });
  } catch {
    // Audit logs no deben bloquear la operación principal.
  }
}

