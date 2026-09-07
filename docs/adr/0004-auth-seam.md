# ADR 0004 — One auth seam per app, and nothing else imports the library

Status: accepted, **implemented in P2** · 2026-09-06

## Context

Clerk is spread across **44 references in 37 files**: two `<ClerkProvider>`s, themed sign-in
and sign-up components, an avatar, a login modal, a `verify-admin` API route, and **nine
files performing authorization by comparing an email against `ADMIN_EMAIL`**. Authorization
scattered across nine string comparisons is authorization nobody can audit.

There is one user row in production and it is disposable, so there is no migration, no ID
preservation and no claim-account flow to design.

## Decision

- Better Auth in both apps, with its models defined in `packages/database/prisma/schema.prisma`
  via the Prisma adapter. **The Better Auth CLI does not own migrations** — one schema, one
  history.
- **Exactly one seam per app**: `apps/{www,admin}/lib/auth.ts`, exporting `getIdentity()` and
  `requireAdmin()`. No other file imports the auth library. That is the whole point: swapping
  provider, adding a role, or fixing an authorization bug is a change in one file.
- `apps/admin` gets a separate admin identity and **no public sign-up** — the existing route
  is deleted. The first `SUPER_ADMIN` is seeded by a CLI script.
- `User.email` becomes non-null and unique; `User.id` becomes a cuid. The lazy-create sites
  are deleted rather than ported.
- Exit criterion is mechanical: `grep -rn "@clerk" apps packages | grep -v node_modules`
  returns nothing.

## Consequences

- Blocked on ADR 0005's sibling work in `packages/mail`: Better Auth cannot verify an address
  or reset a password without transactional email.
- Both CSPs lose their Clerk origins, and all `CLERK_*` and `ADMIN_*` variables leave the six
  `.env` files.
- `proxy.ts` currently wraps `intlMiddleware` in `clerkMiddleware`. The replacement must
  compose with `next-intl` and be verified for locale routing and post-sign-in redirects in
  **both** `en` and `ar` — a redirect that drops the locale is the obvious failure here.

## Outcome (P2)

Implemented as written. `grep -rn "@clerk" apps packages | grep -v node_modules` returns
nothing — down from **44 references across 37 files**.

Three things the implementation added that this ADR did not anticipate:

- **`role` had to become a real column** before the seam could exist at all. The nine
  `ADMIN_EMAIL` comparisons were not just scattered, they were the *only* notion of an
  administrator; there was nothing for `requireAdmin()` to read. Migration `0013` gives
  `user_role` a column and `users.role` a default.
- **The one production user has a NULL email**, which Better Auth requires to be NOT NULL and
  UNIQUE. Deleting it would have cascaded the 4 production orders, so it is backfilled with an
  address in the reserved `.invalid` TLD and given no `accounts` row: it cannot sign in, its
  order history survives, and it is visibly a migration artefact.
- **The client seam declares the additional user fields inline** rather than inferring them
  from `typeof auth`. The documented shortcut drags the server instance's type — and its
  `requiredEnv` calls — toward the browser bundle. The cost is that `lib/auth.ts` and
  `lib/auth-client.ts` must agree on four field names; both are short and adjacent.

Verified end to end against the branch, not merely compiled: sign-up returns 200 and writes to
our database, new users default to CUSTOMER, the password is stored hashed, sign-in is refused
with 403 before verification and accepted with 200 after, a wrong password gives 401, and a
session row is created.
