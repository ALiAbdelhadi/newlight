# P1 — progress report

§26 scopes P1 as *schema v2 + Cloudinary migration + DB→v2 transform + catalog export script
+ search rewrite*. Four of the five are done and verified. The fifth — the Cloudinary upload
— is written, scanned, and waiting on three environment variables; §5 says exactly what that
leaves undone.

Amendments are in [schema-v2-amendments.md](schema-v2-amendments.md); where BUILD and that
file disagree, that file wins.

---

## 1. Finished

| | |
|---|---|
| `prisma/schema.prisma` | v2, validates clean |
| `prisma/migrations/` | 12 migrations, `0000`–`0011` |
| Domain boundaries | `money.ts`, `locale.ts`, `translation.ts`, `slug.ts`, `inventory.ts`, `spec-map.ts`, `media.ts` |
| Transform | `transform-v1-to-v2.ts` — **run, every §18.3 invariant holds** |
| Media pipeline | `media-migrate.ts` (scan ✓ / upload / verify) + committed manifest |
| Catalog backup | `export-catalog.ts` — export **and** a self-verifying restore (§20 conditions 2 and 7) |
| Search | `apps/www/actions/search.ts` rewritten onto `ProductSpec` (§2.2) |
| Audits, as scripts | `audit-catalog.ts` (§10.3/§19), `audit-media.ts` (§15.2) |
| Tooling | `with-env.mjs` (§0.4 guard), `migrate-to.mjs`, `verify-chain.mjs` |
| ADRs | `docs/adr/0001`–`0007` (§29) |
| Gates | `lint` 0 errors · `check-types` at budget · `db:verify-chain` green · `audit:catalog` all assertions hold · `media:audit` amber (upload only) |

**The branch is now pure v2 with all production data migrated**, at `0011`, and
`prisma migrate status` reports `Database schema is up to date!`

### The chain

| | | |
|---|---|---|
| `0000` | baseline | Production exactly as it stood, captured read-only. Its `_prisma_migrations` is empty — it was `db push`ed, never migrated. |
| `0001` | money → `DECIMAL(12,2)` | §4. Verified lossless on every real row. `products_price_positive` CHECK. |
| `0002` | per-locale taxonomy slugs, SEO fields, `deletedAt` | §9.2/§14.6. Slugs nullable here; `0011` makes them `NOT NULL`. |
| `0003` | `product_families` | §6. Replaces `baseProductId` + the runtime SKU regex. |
| `0004` | `product_images` | §5. No `isPrimary`; `order = 0` *is* primary. |
| `0005` | `product_colors` | §8. Five keys preserved exactly; hex derived from the Tailwind swatches. |
| `0006` | normalised specs | §7. 15 definitions seeded with every A1–A3/B correction, ordered `5,10,20 … 140`. |
| `0007` | slug history | §10. |
| `0008` | `admin_audit_log` | §11, F1/F2. `actor_type` includes `WEBHOOK` from day one. |
| `0009` | inventory ledger | §13. Three `stock_levels` CHECK constraints. |
| `0010` | order lifecycle, payment enums, `ProductConfiguration` | §12, F1–F5, Q4, §3. |
| `0011` | drop the v1 catalog columns | §2.1. **Destructive, not reversible, refuses to run before the transform.** |

## 2. Evidence

**The chain reproduces the schema exactly, including what Prisma cannot see.**

```
[chain] OK: replaying every migration from empty reproduces schema.prisma exactly.
[chain] OK: all 4 §4.6 check constraints present.
```

Prisma cannot express a CHECK constraint and `migrate diff` is blind to it — tested both
directions. Convenient (never drift) and dangerous (nothing would notice one vanishing), so
`verify-chain` asserts all four by name after the diff.

**Every fact the transform depends on still holds**, as an assertion rather than a paragraph:

```
$ NODE_ENV=production pnpm --filter @repo/database audit:catalog
  ok   sum(price)                                        232454.00  (expected 232454.00)
  ok   empty in en / ar                                    14 / 14
  ok   production keys with no SPEC_MAP entry                    0
  ok   families with inconsistent variantType                    0
[audit] OK: every asserted fact holds.
```

**The §15.2 media gate is GREEN, and nothing needs photographing.**

```
377 references (347 distinct) across 189 products
  resolved exact in www   : 360
  resolved exact in admin :   9   <- files that exist ONLY in the admin tree
  resolved via override   :   7   (3 mechanical + 4 needs-review)
  UNRESOLVED              :   0
```

`nl-blade (1–5).webp` were never missing — all five sit in
`apps/admin/public/products/outdoor/stairs-light/nl-stairs-light-2/` under exactly the
recorded names. Details and the evidence for each restored override are in A23.

**`0011`'s ordering is enforced.** Against the branch:

```
Error: refusing to drop v1 catalog columns: 189 product(s) exist but
product_specs=0 and product_images=0. Run the P2 transform first.
```

**`§0.4` is a guard, not an intention.**

```
$ NODE_ENV=production pnpm db:migrate
[guard] REFUSED: DATABASE_URL points at ep-round-river (production).
```

**The transform ran, and every §18.3 invariant holds.**

```
[1/9] taxonomy slugs        54 written, 0 collisions
[2/9] families              89 families, 178 translations
[4/9] product specs       2051 rows; 14 products have no specification data at all
[6/9] product images       371 rows (8 via override, 9 from the admin tree)
[8/9] inventory            189 INITIAL movements; inventory.opening_count_pending=true

  ok   product count                             189  (expected 189)
  ok   sum(price) to the cent              232454.00  (expected 232454.00)
  ok   product translations                      378  (expected 378)
  ok   families                                   89  (expected 89)
  ok   taxonomy slugs still null                   0  (expected 0)
  ok   ledger vs stock_levels drift                0  (expected 0)
```

**Idempotency is proven, not asserted.** The second run produced identical counts and
`0 INITIAL movements` — the ledger deduplicated by `(type, referenceType, referenceId)`
exactly as F5 requires.

**363 coercions and 18 warnings, all itemised, none repaired.** 342 IP coercions
(`20 → IP20`, `65 → IP65`), the 4 trailing-whitespace trims for slug generation, the 8
`سمك العود` merges, 17 media resolutions, and every N4 defect — the two `false` booleans, the
9 whitespace-padded materials — carried across verbatim with the SKU named.

**`0011` ran, and the branch reproduces the schema exactly.**

```
$ prisma migrate diff --from-url <branch> --to-schema-datamodel prisma/schema.prisma
-- This is an empty migration.
```

**§20 condition 7 — a proven restore into an empty database**, not a script that could
perform one:

```
  ok   products                        189  (expected 189)
  ok   product specs                  2051  (expected 2051)
  ok   price total               232454.00  (expected 232454.00)
[catalog] restore verified against the export it came from.
```

## 3. Defects found and repaired

**`configurations."productId"` never held a product id** (A17). All 13 rows hold a SKU: it
joins `products."productId"` 13/13 and `products."id"` **0/13**, with no FK to catch it. v1's
`Configuration → Product` relation resolved for zero rows. Repaired in `0010`, with the
resolution asserted inside the migration.

Also: `cart_items.selectedColorTemp` was `TEXT` while `order_items`' was the enum; the four
orders had `NULL` payment method and status, so "not recorded" and "not paid" were
indistinguishable; two indexes duplicated their own unique constraints and one indexed a
two-valued flag over one row per user.

**Three of my own defects**, found by re-reading the full spec: `lighting_type` at the wrong
position (A20), the `ProductConfiguration` rename and three dead money columns missed (A21),
and the four §4.6 CHECK constraints missing (A22). All corrected in the migrations
themselves — an undeployed chain gets edited, not patched.

## 4. The error budget moved backwards, once

`www 138 → 140`, `admin 100 → 108`, because A21 legitimately drops three more columns and
renames a table. Every new error is a reference to a dropped column, `Configuration.productIp`,
or a pruned `OrderStatus` value — P3/P5 adaptation work, none of it a regression.

The raise is recorded in `scripts/verification-budget.json`'s new `history` block with its
cause. A ceiling that rises with no entry there is the mechanism failing.

## 5. What P1 still owes

**One thing: the Cloudinary upload.** Everything around it is done.

```
pnpm --filter @repo/database media:upload     # 347 files, 232.8 MB, resumable
```

It needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in
`packages/database/.env.local`. Until then the manifest reads `provider: "local"` and every
`ProductImage.url` is a repo path — which the transform reports loudly and refuses to produce
unless told `--allow-local-media`. Re-running the transform after the upload rewrites those
URLs in place; it is idempotent, so nothing else has to be redone.

`res.cloudinary.com` is already added to `remotePatterns` **and** the CSP `img-src` in both
apps — the failure mode that only shows up in production.

## 6. Open, and who owns it

| | Owner |
|---|---|
| **Cloudinary credentials** — the three names above | Ali |
| **Neon PITR retention** — console-only. Blocks §20 condition 5 and P6 step 2 only. | Ali |
| **Four `needs-review` media overrides** for `nl-s-l-2-5*7-cm` — structurally unambiguous, but they assign photographs to a product. Eyeball before cutover. | Ali |
| **The catalog has no product names** (A26) — every one of the 378 is a SKU. Top of the P5 queue, not a migration problem. | Ali / P5 |

## 7. Commands

```bash
pnpm --filter @repo/database audit:catalog     # §10.3/§19 — assert, don't describe
pnpm --filter @repo/database media:audit       # §15.2 gate (pre- and post-0011)
pnpm --filter @repo/database media:scan        # manifest, no credentials needed
pnpm --filter @repo/database media:upload      # ← the one thing outstanding
pnpm --filter @repo/database transform         # §18, idempotent
pnpm --filter @repo/database db:migrate:to 0011_drop_v1_catalog_columns
pnpm --filter @repo/database catalog:export
pnpm --filter @repo/database catalog:restore <file>
SHADOW_DATABASE_URL=... pnpm --filter @repo/database db:verify-chain
```

## 8. What P2 starts from

- The branch is pure v2, at `0011`, holding all migrated production data.
- `packages/mail` and Better Auth are the whole of P2; ADR 0004 records the seam decision
  and its one hard rule — no file outside `apps/{www,admin}/lib/auth.ts` imports the auth
  library. Baseline for the exit grep: **44 `@clerk` references across 37 files**.
- The contact route still carries `TODO(P2)` where push notification was removed (A8); its
  replacement is the §16 `EmailOutbox` admin-notification template.
- Reading a nullable-in-database, non-nullable-in-schema column through the generated client
  fails with `P2032`. It no longer applies now `0011` has run, but it is why the transform
  writes taxonomy slugs with `$executeRaw`, and it will apply again to any future phased
  column.
