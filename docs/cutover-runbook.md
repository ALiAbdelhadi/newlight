# Cutover runbook

Executes ADR 0006 — **promote the transformed branch**, do not migrate production in place.
Read that ADR first; this is the ordered form of its decision, not a second decision.

Nothing here is run automatically. Every step is a command you run, or a thing you confirm.
The one script that exists — `cutover:preflight` — is read-only and refuses to declare
readiness on your behalf.

---

## Before the window

These do not need downtime and should be done days earlier.

| # | Step | How you know it is done |
|---|---|---|
| 1 | Confirm Neon **PITR retention** on the production project | You have read the window in the console. §20 condition 5 |
| 2 | Verify the **Resend sending domain** | A test send arrives, rather than being queued |
| 3 | Finish the **Cloudinary upload** | `pnpm --filter @repo/database media:upload` reports 0 pending |
| 4 | **Rotate** the seeded SUPER_ADMIN password | You changed it; the printed one no longer works |
| 5 | Decide the **announcement** | Storefront is read-only for the window; orders placed during it are lost |

## The window

Roughly 30 minutes, of which the transform is ~15 (see "If the window gets tight").

```bash
# 0. State the starting point, in writing.
pnpm --filter @repo/database db:status          # branch: 14/14
pnpm --filter @repo/database cutover:preflight   # every automatic check ok
```

**1 — Freeze writes.** Put the storefront in maintenance. From this moment production is a
read-only source, which is the state it has been in since P1 and the only state the rest of
this assumes.

**2 — Take a fresh production snapshot and restore it into the branch.**

This overwrites the branch, including anything created there during development — the seeded
admin, test orders, the P5 audit rows. That is intended: the branch becomes production plus
the v2 schema, and nothing else.

```bash
# Export production's catalog first — this is the artifact a rollback restores from.
pnpm --filter @repo/database catalog:export
```

**3 — Baseline, migrate to `0010`, transform, then the rest.**

The order is the whole point: `0011` drops the columns the transform reads, so it cannot run
before the transform. This is why cutover is a branch promotion (ADR 0006).

```bash
pnpm --filter @repo/database db:migrate:to --baseline 0000_baseline_production
pnpm --filter @repo/database db:migrate:to 0010_order_lifecycle_and_configuration
pnpm --filter @repo/database transform
pnpm --filter @repo/database db:migrate:to 0013_better_auth
```

The **first line is not optional**, and an earlier version of this runbook was missing it. The
restored database already HAS the v1 schema, so `0000_baseline_production` must be recorded and
not executed — running it fails on the first type it re-creates
(`type "available_colors" already exists`). Migration names are full names; `0010` alone is
rejected.

Rehearse this whole block first — see below.

**4 — Reconcile.** The transform prints its own reconciliation and fails the run if the price
sum drifts. Then re-run the preflight, which asserts the same numbers independently:

```bash
pnpm --filter @repo/database cutover:preflight
pnpm --filter @repo/database media:sync        # catalog images -> Cloudinary URLs
pnpm --filter @repo/database media:verify      # every URL returns 200
pnpm --filter @repo/database audit:catalog
```

**5 — Seed the administrator**, because the restore replaced the branch's user table:

```bash
pnpm --filter @repo/database seed:super-admin -- --email <you> --name "<name>"
```

Change that password immediately. It is printed once, to a terminal.

**6 — Smoke test, before the old endpoint is released.** ADR 0006's list, in full:

- [ ] Browse the storefront in **both locales**; Arabic renders RTL and prices carry one symbol
- [ ] Place an order end to end
- [ ] Ship it from the admin panel; the tracking number saves
- [ ] Confirm delivery — payment settles through `settlePaymentForDelivery` and nowhere else
- [ ] Refuse a COD order; stock returns to the ledger
- [ ] Sign up as a customer, and reset a password
- [ ] Sign in to the admin panel

**7 — Promote.** In the Neon console, make the branch the primary and point
`DATABASE_URL` / `DIRECT_DATABASE_URL` in both deployments at the new endpoint.

**8 — Keep the old endpoint for one release cycle.** It *is* the rollback: swapping back is an
endpoint change measured in seconds. Do not delete it because the smoke test passed.

## Rollback

| When | What |
|---|---|
| Before promotion | Nothing to undo. Production never changed |
| After promotion, same day | Point both deployments back at the old endpoint. Orders placed since promotion are lost — that is why the window is announced |
| After the old endpoint is gone | PITR restore. This is the only path, and §20 condition 5 is what makes it exist |

## After

- [ ] `pnpm --filter @repo/database cutover:preflight` against the promoted database
- [ ] Watch the mail outbox drain: `dispatchOutbox` on its cron, `attempts` not climbing
- [ ] Close the **opening stocktake** (`/admin/inventory`) once stock is physically counted —
      valuation and margin refuse to produce numbers until then, by design (N1)
- [ ] Only then, retire the legacy JSON under §20 — all seven conditions, not six

## Rehearse it, with one command

```bash
pnpm --filter @repo/database cutover:rehearse
```

Dumps production **read-only**, restores into a throwaway database on localhost, and runs the
sequence above end to end — baseline, `0001`–`0010`, transform, `0011`–`0013` — then checks
that the result reproduces `schema.prisma` exactly. It refuses any target that is not on
localhost, and never names the branch.

Run it before the window. The first rehearsal found the missing baseline step above.

## About the transform's duration

The transform ran in **0.9 seconds** against a local Postgres holding the same 189 products,
and takes **~15 minutes** against Neon. The cost was never the work; it is the round trip, and
the fix was to stop making one per row: the per-row `upsert` loops are now batched through
`prisma.$transaction([...])`, and the 189 opening-balance movements share one transaction
instead of 189.

The ledger still writes one movement at a time inside that transaction, because
`recordMovement` is the only writer of the stock ledger and bypassing it to go faster would
break the invariant it exists to hold.

Two consequences for the window:

- **Where you run it matters more than what it does.** Latency × requests is the whole cost, so
  running it from a machine in the database's region is a bigger win than any further batching.
- **Measure it in the rehearsal, not here.** A local rehearsal proves the sequence and the
  numbers; it cannot predict the duration against Neon.
