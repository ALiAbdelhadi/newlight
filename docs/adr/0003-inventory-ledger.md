# ADR 0003 — Inventory is an append-only ledger with one writer

Status: accepted, implemented in P1 · 2026-09-06

## Context

v1 had `Product.inventory`: a single mutable integer, written from **three independent code
paths** with three different concurrency stories — one Serializable and correct, one a plain
check-then-mutate, one a `$transaction` with no isolation level. It could not answer "why is
this 3 and not 5", a concurrent checkout could lose a decrement, and nothing distinguished a
sale from a damaged unit from a correction.

## Decision

- Append-only `StockMovement` plus a derived `StockLevel` (migration `0009`).
- **`packages/database/inventory.ts` is the only writer**, and every function takes a
  `Prisma.TransactionClient`, so it is impossible to call outside a transaction. The movement
  insert and the level update share that transaction, making a level that disagrees with its
  movements unreachable rather than unlikely.
- **The sign of `quantity` must match the movement type.** A `SALE` of +5 is not a mistake a
  caller gets to make.
- **Referenced movements are idempotent** (F5): a retried delivery webhook, a double-clicked
  admin button and a replayed job all apply once. This is a property of the ledger, not a UI
  guard — the UI is not where retries happen.
- Three CHECK constraints in the database as well as in the code: `onHand >= 0`,
  `reserved >= 0`, `reserved <= onHand`. A check in application code protects one code path.
- `unitCost` is nullable and **never zero**. NULL means "not recorded"; 0 means "free", and
  conflating them silently reports 100% margin.
- Reservations are **not** movements: nothing has physically moved, so writing one would put
  a fiction in the ledger.
- `ON DELETE RESTRICT` from movements to products: a product with movement history is
  soft-deleted, never removed.

## Consequences

- All three v1 mutation paths collapse into `recordMovement()` in P3b.
- Opening balances are the seeded placeholder 5000 with `unitCost = null`, and the
  `inventory.opening_count_pending` flag suppresses stock valuation until the first real
  stocktake (N1). The ledger's credibility starts at that count, and the system says so
  until then.
- `reconcile()` replays the ledger and compares it with the stored level, so "someone wrote
  `stock_levels` directly" is detectable rather than theoretical.
