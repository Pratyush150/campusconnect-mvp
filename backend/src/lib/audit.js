import { prisma } from "./prisma.js";

export async function audit({ actorId, entity, entityId, action, previousState, newState, assignmentId, metadata }) {
  return prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      entity,
      entityId,
      action,
      previousState: previousState || null,
      newState: newState || null,
      assignmentId: assignmentId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
