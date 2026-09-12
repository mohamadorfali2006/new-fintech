// Audit helper — fire-and-forget audit trail for mutating API routes.
//
// TODO(infra): add `model AuditLog` to prisma/schema.prisma and run
// `prisma migrate dev`. Until then this helper MUST NOT throw: it detects
// a missing `auditLog` delegate at runtime and falls back to the structured
// logger (level info, msg "audit.fallback").
//
// Expected AuditLog shape (when the model lands):
//   model AuditLog {
//     id        String   @id @default(cuid())
//     userId    String
//     action    String   // e.g. "budget.create", "subscription.delete"
//     entity    String   // e.g. "budget"
//     entityId  String?
//     metadata  String?  // JSON-encoded details
//     createdAt DateTime @default(now())
//     @@index([userId, createdAt])
//   }

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AuditAction =
  | "transactions.list"
  | "transactions.export"
  | "budget.create"
  | "budget.update"
  | "budget.delete"
  | "subscription.create"
  | "subscription.delete";

export interface AuditInput {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  requestId?: string;
}

/**
 * Write an audit record. Never throws — on any failure (including the
 * AuditLog model not existing yet) it logs via the structured logger and
 * resolves. Callers must NOT await critical-path logic on this; `void`
 * (fire-and-forget) or `await` in a non-blocking position are both fine.
 */
export async function audit(input: AuditInput): Promise<void> {
  const { userId, action, entity, entityId, metadata, requestId } = input;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    if (!db || typeof db.auditLog?.create !== "function") {
      // Safe fallback: model not yet migrated.
      logger.info({
        msg: "audit.fallback",
        userId,
        action,
        entity,
        entityId,
        metadata,
        requestId,
        reason: "auditLog model missing",
      });
      return;
    }
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    // Last-resort fallback: audit must never break the request.
    logger.warn({
      msg: "audit.write_failed",
      userId,
      action,
      entity,
      entityId,
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
