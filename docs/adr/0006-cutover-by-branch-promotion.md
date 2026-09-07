# ADR 0006 — Cutover is a Neon branch promotion, not an in-place migration

Status: accepted, to be executed in P6 · 2026-09-06

## Context

§26 orders cutover as "production schema migrated → production catalog transformed". That is
not directly executable, because migration `0011` drops the very columns the transform reads.
In P1 this is a non-issue — the branch holds a restored snapshot and the transform runs before
`0011`. In P6, source and destination would be the same database.

## Decision

**Option A: promote the transformed branch.** The old production endpoint becomes the rollback
branch, and rollback is an endpoint swap — seconds, not hours.

This works because the *mutable* production dataset is tiny: 1 user, 1 address, 4 cancelled
orders, **0 order items**, 0 carts, 0 contact forms, 13 configurations, 11 MB total. The
catalog is static. So re-transforming from a fresh production snapshot immediately before
promotion loses essentially nothing.

Rejected — Option B, in place: apply `0001`–`0010` to production, transform in place, then
`0011`. After `0011` the only reversal is a PITR restore.

## Consequences

- **P6 sequence**: verify baseline status → confirm PITR retention → confirm the latest
  catalog export → confirm the media manifest → restore a fresh production snapshot into the
  branch → migrate to `0010` → transform → `0011` → reconcile → smoke test → promote → keep
  the rollback branch for one release cycle.
- The transform currently takes **~15 minutes** (roughly 3,400 individual round-trips over
  the pooler), and under Option A that lands inside the cutover window. Batching the spec and
  image writes would cut it to under a minute if the window ever gets tight.
- **PITR retention is still unconfirmed** and blocks §20 condition 5 and this step. Option A
  reduces the reliance on PITR — the previous endpoint *is* the rollback — but does not
  remove it.
- Smoke test before the old endpoint is released: browse both locales, place an order end to
  end, ship it, confirm delivery, refuse one, sign up, reset a password, admin login.
