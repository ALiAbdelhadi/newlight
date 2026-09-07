-- 0013  Better Auth  (BUILD §7)
--
-- Authentication moves off Clerk. Identity, sessions and credentials are ours, in this
-- database, in this migration history. The Better Auth CLI never generates a migration —
-- one schema, one chain.
--
-- The three tables below have a shape Better Auth's Prisma adapter dictates; the field names
-- are not ours to choose. What IS ours is `users.role`, which is why this migration finally
-- gives `user_role` a column: authorization today is NINE separate comparisons of
-- `user.emailAddresses[0].emailAddress` against an `ADMIN_EMAIL` environment variable,
-- scattered across nine files. Authorization spread across nine string comparisons is
-- authorization nobody can audit.
--
-- THE ONE EXISTING USER. Production has exactly one user row, and its email is NULL:
--   user_37GaAGHjYvaoaaPjWIEeOupc2JS | <null> | ar
-- Better Auth requires email NOT NULL and UNIQUE, so something has to give. It is NOT
-- deleted: `orders.userId` cascades, so deleting it would destroy the 4 production orders
-- and break the §18.3 reconciliation invariant. Instead it is backfilled with an address in
-- the reserved `.invalid` TLD, which by RFC 2606 can never resolve and therefore can never be
-- accidentally emailed or collide with a real address.
--
-- That row keeps its Clerk-issued id and gets no `accounts` row, so it cannot sign in — which
-- is correct. §7 is explicit that there is no claim-account flow: the owner re-registers, and
-- the historical orders stay attached to a row that is visibly a migration artefact.

CREATE TYPE "public"."user_role" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');

ALTER TABLE "public"."users"
    ADD COLUMN "name"          TEXT,
    ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "image"         TEXT,
    ADD COLUMN "role"          "public"."user_role" NOT NULL DEFAULT 'CUSTOMER';

-- Backfill before the NOT NULL constraints, never after.
UPDATE "public"."users"
   SET "email" = 'migrated-' || "id" || '@newlight.invalid'
 WHERE "email" IS NULL;

UPDATE "public"."users"
   SET "name" = 'Migrated customer'
 WHERE "name" IS NULL OR btrim("name") = '';

DO $$
DECLARE unresolved INT;
BEGIN
    SELECT count(*) INTO unresolved FROM "public"."users" WHERE "email" IS NULL OR "name" IS NULL;
    IF unresolved > 0 THEN
        RAISE EXCEPTION 'refusing to add NOT NULL: % user(s) still have no email or name', unresolved;
    END IF;
END $$;

ALTER TABLE "public"."users"
    ALTER COLUMN "email" SET NOT NULL,
    ALTER COLUMN "name"  SET NOT NULL;

-- users.id gains @default(cuid()) in the schema, which Prisma generates in the CLIENT, not in
-- the database. Adding a database-side default here would hand out uuids where the schema
-- promises cuids, and `migrate diff` would report it as permanent drift.

CREATE INDEX "users_role_idx" ON "public"."users"("role");

CREATE TABLE "public"."sessions" (
    "id"        TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");
CREATE INDEX "sessions_userId_idx" ON "public"."sessions"("userId");
-- The sweep that deletes expired sessions reads this, and so does every session lookup.
CREATE INDEX "sessions_expiresAt_idx" ON "public"."sessions"("expiresAt");

CREATE TABLE "public"."accounts" (
    "id"                    TEXT NOT NULL,
    "accountId"             TEXT NOT NULL,
    "providerId"            TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "password"              TEXT,
    "accessToken"           TEXT,
    "refreshToken"          TEXT,
    "idToken"               TEXT,
    "accessTokenExpiresAt"  TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope"                 TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- One account per (provider, account id): the constraint that stops a second credential row
-- silently shadowing the first.
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "public"."accounts"("providerId", "accountId");
CREATE INDEX "accounts_userId_idx" ON "public"."accounts"("userId");

CREATE TABLE "public"."verifications" (
    "id"         TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verifications_identifier_idx" ON "public"."verifications"("identifier");
CREATE INDEX "verifications_expiresAt_idx" ON "public"."verifications"("expiresAt");

ALTER TABLE "public"."sessions"
    ADD CONSTRAINT "sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."accounts"
    ADD CONSTRAINT "accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
