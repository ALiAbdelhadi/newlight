-- Shared rate-limit counters.
--
-- The contact form's limiter lived in a module-level Map: per-instance, reset on every cold
-- start, and therefore close to no limit at all on serverless. This is the state every
-- instance can see.
--
-- `windowStart` is `timestamp(3)` WITHOUT time zone, like every other timestamp in this schema,
-- and Prisma writes UTC into it. Anything comparing against it must say `now() AT TIME ZONE
-- 'UTC'` — a bare `now()` is a timestamptz and coerces through the session timezone, which is
-- the defect P4 found three times (A55).

CREATE TABLE "public"."rate_limits" (
    "key"         TEXT NOT NULL,
    "count"       INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- The sweep deletes by age, so it reads this rather than the whole table.
CREATE INDEX "rate_limits_windowStart_idx" ON "public"."rate_limits"("windowStart");

-- A counter cannot go backwards past zero.
ALTER TABLE "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_count_non_negative" CHECK ("count" >= 0);
