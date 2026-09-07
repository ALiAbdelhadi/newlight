-- 0008  Audit log  (BUILD §11, foundations F1/F2)
--
-- Today an order changes status and nothing records who did it. This table is both the
-- admin audit trail and the order-transition history.
--
-- actorType (F1) makes every transition attributable. WEBHOOK is in the enum from day one
-- even though nothing emits it: when a courier integration lands, its events are already
-- distinguishable from an admin's clicks without backfilling history that was never
-- recorded. Adding an enum value later would leave every pre-existing courier event
-- mislabelled as SYSTEM, which is exactly the ambiguity this column exists to prevent.
--
-- actorType/actorId/actorEmail are all nullable: rows written by a migration or a cron
-- have no actor, and a NULL that means "nobody" is honest where 'SYSTEM' with a fake id
-- is not.

CREATE TYPE "public"."actor_type" AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM', 'WEBHOOK');

CREATE TABLE "public"."admin_audit_log" (
    "id"         TEXT NOT NULL,
    "actorType"  "public"."actor_type",
    "actorId"    TEXT,
    "actorEmail" TEXT,
    "action"     TEXT NOT NULL,
    "entity"     TEXT NOT NULL,
    "entityId"   TEXT NOT NULL,
    "diff"       JSONB,
    "ip"         TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- "what happened to this order" / "what did this admin do" / "what happened on Tuesday".
CREATE INDEX "admin_audit_log_entity_entityId_createdAt_idx" ON "public"."admin_audit_log"("entity", "entityId", "createdAt");
CREATE INDEX "admin_audit_log_actorId_createdAt_idx" ON "public"."admin_audit_log"("actorId", "createdAt");
CREATE INDEX "admin_audit_log_createdAt_idx" ON "public"."admin_audit_log"("createdAt");
