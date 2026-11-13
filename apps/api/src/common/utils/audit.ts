// apps/api/src/common/utils/audit.ts
import { prisma } from '@hbms/database';

export interface AuditParams {
  hotelId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        hotel_id: params.hotelId,
        actor_id: params.actorId,
        actor_role: params.actorRole,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        previous_state: params.previousState ? JSON.stringify(params.previousState) : undefined,
        new_state: params.newState ? JSON.stringify(params.newState) : undefined,
        ip_address: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

