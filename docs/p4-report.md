# P4 — the test suite

**154 tests across 12 files, in 3 packages. All passing, none skipped.** That is §26's P4 exit
criterion. Decisions in [schema-v2-amendments.md](schema-v2-amendments.md) A54–A58.

```
[gate] OK: "test" executes in 3 package(s)
@repo/database   79 passed (7 files)
@repo/mail       29 passed (2 files)
www              46 passed (3 files)
```

---

## 1. The suite found three real bugs

None of them was visible to `tsc`, and all three are in code that reads correctly.

**The same timezone defect, three times.** Every timestamp column in this schema is
`timestamp(3) WITHOUT time zone` and Prisma writes **UTC** into them. A bare `now()` is a
`timestamptz`, and a JS `Date` passed as a raw parameter arrives as one too — so comparing
either against those columns coerces through the **session timezone**. On this machine that is
`Africa/Cairo`, three hours ahead:

| | What it did |
|---|---|
| `dispatchOutbox` | Claimed every backed-off row immediately — a failing mail transport was retried on **every sweep** instead of at 1, 5, 15, 60, 360 minutes |
| `sellThrough` | Returned an empty list for any window |
| `deadStock` | Listed every product as dead stock, including ones that had just sold |

Neon defaults to UTC, so this would have hidden in production until a restore or a config
change. Fixed with `now() AT TIME ZONE 'UTC'` and a `utcBoundary()` helper that is independent
of both the session timezone and how the driver types a `Date` (A55).

This is what §11's "after an arbitrary sequence of operations" is actually for.

## 2. The harness

```bash
TEST_DATABASE_URL=postgresql://$USER@localhost:5432/postgres pnpm test
```

§11 offers testcontainers or a Neon branch per run. The harness takes a **base connection URL**
instead, because that covers both plus a plain local server — and the tests do not have to know
which they got (A54). Each test **file** creates `newlight_test_<random>`, applies the **real
migration chain** to it, and drops it afterwards.

Applying the chain rather than `db push` matters: `db push` would produce a schema no
deployment ever creates, and every test of a migration's seeded data or its CHECK constraints
would be testing something that does not exist.

## 3. What is covered

| §25 requirement | Where |
|---|---|
| Inventory invariant under an arbitrary sequence | `database/test/inventory.test.ts` — 10 interleaved operations, then `reconcile()` |
| Order lifecycle: reserve → SALE → RETURN → release, oversell, idempotency | `database/test/order-state-machine.test.ts` |
| Every illegal transition rejected | Loop over all **64** (from, to, actor) combinations against the declared 11 |
| Money: Decimal arithmetic, string serialisation, locale formatting | `database/test/money.test.ts` |
| Slugs: A6 rule, percent-encoding round trip, 301 from history per locale | `database/test/slug.test.ts`, `www/test/search-and-slugs.test.ts` |
| i18n: no silent `en` for a missing `ar` | `database/test/translation.test.ts` |
| Storefront reads: specs in both locales, family grouping, image order, availability | `www/test/storefront.test.ts` |
| Search: each rewritten filter, and the three documented deltas | `www/test/search-and-slugs.test.ts` |
| Mail: both locales, outbox in the same transaction, failing transport | `mail/test/templates.test.tsx`, `mail/test/outbox.test.ts` |
| Auth: unauthenticated access, admin role enforcement | `www/test/auth.test.ts` |
| Migrations: seeded reference data, CHECK constraints, what 0011 removed | `database/test/migrations.test.ts` |
| Reporting: refusing to invent a number | `database/test/reporting.test.ts` |

## 4. Two things the suite deliberately does not claim

**Transform fidelity is verified where the data is** (A57). §25 asks that counts and the price
sum match production. A fixture with three products cannot honestly assert that — it would be
testing the fixture. `pnpm transform`'s own reconciliation asserts it against the real 189
products and fails the run if the sum drifts from `232454.00`; P1 ran it twice, the second run
proving idempotency. The suite covers what that reconciliation *relies on*.

**"Search equivalence" has nothing left to compare against** (A58). `0011` dropped the eight
columns the old implementation filtered on. Re-creating it to test against would be inventing a
baseline. The tests assert that each filter returns the right rows and that the three
documented deltas behave as documented — including that `valueAr` is *not* searched, asserted
by confirming an Arabic value exists and is not matched.

## 5. Tests that exist because of a specific past failure

- **Every template renders, in both languages.** The bug that shipped was
  `ReferenceError: React is not defined` under one of the two transpilers this package is built
  by (A35), with `tsc --noEmit` clean throughout. Only a test that renders would have caught it.
- **The CHECK constraints, asserted by name.** One of them caught the negative-stock `upsert`
  bug in P3b. A test that fails if someone removes them as "redundant with the code" is the
  point.
- **The transition count.** `expect(declared.size).toBe(11)` means widening the machine's
  permissions can never be an accident. It caught my own arithmetic on first run.

## 6. One structural change

`ADMIN_ROLES` moved from `apps/admin/lib/auth.ts` into `@repo/database` (A56). That module
builds a Better Auth instance at load and throws on a missing secret, so nothing could import
the roles without starting an auth system — a test asserting "a signed-in CUSTOMER is not an
admin" had to duplicate the list or boot the seam. Roles are a domain fact.

## 7. Gates

```
lint          4 packages, 0 errors
check-types   @repo/database 0 · www 0 · admin 97 · @repo/mail 0
test          154 passed, 0 skipped
chain         replaying every migration reproduces schema.prisma, 4 check constraints present
```

`pnpm test` runs behind the same task-count guard as the other gates, so a suite that executes
in zero packages can never exit 0. The `test` task is `cache: false` — a cached pass would skip
creating the database and prove nothing.

## 8. What P5 starts from

- `admin` is the last package with a type-error budget: **97**, all v2-adaptation sites.
- `InventoryService` (P3b) already enforces "stock is never an editable number"; P5 builds the
  screens on it, plus the bulk price editor §13.2 calls a first-class requirement.
- The opening stocktake that clears `inventory.opening_count_pending` is a P5 deliverable, and
  `InventoryService.completeOpeningStocktake()` is already the action behind it.
