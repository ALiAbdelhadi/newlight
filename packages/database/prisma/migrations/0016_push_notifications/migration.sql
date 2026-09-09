-- 0016  Push notifications  (BUILD §17)
--
-- A8 deleted the v1 push channel rather than repairing it: `push_subscriptions` was queried by
-- code but had never existed in production, nothing in either app ever called `subscribe()`,
-- and the two service-worker handlers listened for a message no server could send. Its closing
-- line was that customer- or admin-facing push, if wanted later, is a greenfield addition on
-- the notification model. This is that addition.
--
-- Two changes, and the small one carries the design:
--
--   * `notifications.pushedAt` turns the notification table into its own outbox, the same
--     discipline 0012 gave email. The row is written INSIDE the business transaction that
--     causes it — an order, a cancellation, a contact form — and the delivery happens after
--     the commit. So an order that commits always has its notification queued, and a push
--     service that is unreachable can never roll back an order. NULL means "not yet handled";
--     it is stamped once the fan-out has been attempted, success or permanent failure, so a
--     second sweep cannot re-notify an admin who has already been notified.
--
--   * `push_subscriptions` stores what the browser hands back from `pushManager.subscribe()`.
--     `endpoint` is UNIQUE because a re-subscribe from the same browser must update the row
--     rather than accumulate rows that all deliver to the same place — the difference between
--     one notification and four.
--
-- The partial index is the sweep's claim predicate. A partial index rather than a plain one
-- because the interesting set is permanently tiny — rows are stamped within a minute of being
-- written — while the table itself grows without bound.

ALTER TABLE "public"."notifications"
    ADD COLUMN "pushedAt" TIMESTAMP(3);

-- Existing rows predate the channel; there is nobody subscribed who could have received them
-- and delivering a week-old low-stock alert on deploy would be noise. Treat them as handled.
UPDATE "public"."notifications" SET "pushedAt" = (now() AT TIME ZONE 'UTC') WHERE "pushedAt" IS NULL;

CREATE INDEX "notifications_pushedAt_createdAt_idx"
    ON "public"."notifications" ("pushedAt", "createdAt");

CREATE TABLE "public"."push_subscriptions" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "endpoint"      TEXT NOT NULL,
    "p256dh"        TEXT NOT NULL,
    "auth"          TEXT NOT NULL,
    "userAgent"     TEXT,
    "failureCount"  INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "public"."push_subscriptions" ("endpoint");

CREATE INDEX "push_subscriptions_userId_idx" ON "public"."push_subscriptions" ("userId");

-- CASCADE, not RESTRICT: a deleted user's endpoints are dead mail. Pushing to one can only
-- ever produce a 410 from the push service.
ALTER TABLE "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
