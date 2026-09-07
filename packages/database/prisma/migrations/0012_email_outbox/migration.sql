-- 0012  Transactional email outbox  (BUILD §16)
--
-- Customers currently receive nothing when they order: apps/www/lib/queues/order-queue.ts is
-- three console.log calls behind a class named OrderQueue. Better Auth also cannot verify an
-- address or reset a password without a way to send mail, which is why §6 makes this a
-- blocking dependency of §7 rather than a parallel workstream.
--
-- The outbox exists so that "the order committed" and "the confirmation was sent" are not the
-- same decision. The row is written in the SAME TRANSACTION as the business event; dispatch
-- happens after the commit. So a transport outage delays mail and never fails an order, and a
-- crash between commit and send loses nothing — the sweep picks the row up.
--
-- nextAttemptAt drives exponential backoff and is NULL for "ready now", so the sweep's query
-- is a single index scan over (status, nextAttemptAt).
--
-- dedupeKey is UNIQUE and nullable: "order-confirmation:<orderId>" can only be queued once no
-- matter how many times the business event is retried, while mail that is legitimately
-- repeatable — a second password-reset request — passes NULL and is exempt.

CREATE TYPE "public"."email_status" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

CREATE TABLE "public"."email_outbox" (
    "id"            TEXT NOT NULL,
    "template"      TEXT NOT NULL,
    "to"            TEXT NOT NULL,
    "locale"        TEXT NOT NULL,
    "payload"       JSONB NOT NULL,
    "status"        "public"."email_status" NOT NULL DEFAULT 'PENDING',
    "attempts"      INTEGER NOT NULL DEFAULT 0,
    "lastError"     TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt"        TIMESTAMP(3),
    "dedupeKey"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_outbox_dedupeKey_key" ON "public"."email_outbox"("dedupeKey");
CREATE INDEX "email_outbox_status_nextAttemptAt_idx" ON "public"."email_outbox"("status", "nextAttemptAt");
CREATE INDEX "email_outbox_createdAt_idx" ON "public"."email_outbox"("createdAt");
