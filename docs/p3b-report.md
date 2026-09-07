# P3b — inventory ledger runtime and the order state machine

Complete. Every §26 P3b exit criterion is met and was exercised against the branch, not
asserted. Decisions in [schema-v2-amendments.md](schema-v2-amendments.md) A47–A53 and
[ADR 0005](adr/0005-order-state-machine.md).

---

## 1. The §12 vulnerability is closed

`updateOrderStatus(orderId, status)` accepted **any of the seven statuses from any
authenticated user who owned the order**, and set `shippedAt` / `deliveredAt` to match. The
only check was `where: { id, userId }`. Under COD, `delivered` is the event that settles
payment — so a customer could mark their own order paid.

It is deleted, not guarded. A signature that takes a target status invites the next caller to
pass one, so the customer-facing action no longer takes one: `requestOrderCancellation` is the
only customer-facing transition, because cancellation is the only transition a CUSTOMER may
cause (A48).

```
  ok   a CUSTOMER may NOT mark delivered  ← the §12 vulnerability
  ok   a customer cannot mark their order delivered  ← §12 closed
```

## 2. Exit criteria, run

```
── The declared machine (F2) ──────────────────────────────────────
  ok   a CUSTOMER may cancel before shipping
  ok   a CUSTOMER may NOT ship
  ok   a WEBHOOK may deliver (F2, before anything emits one)
  ok   delivered -> shipped is not a transition at all

── Reserve -> ship -> deliver (§8.3) ──────────────────────────────
  ok   order creation reserves, does not sell         reserved 3->6, onHand 5000
  ok   no movement written for a reservation
  ok   shipping writes a SALE movement
  ok   shipping releases the reservation
  ok   shipping decrements onHand                     5000 -> 4997
  ok   shipping does NOT settle payment (F4)
  ok   delivery settles payment through the one function (F4)
  ok   delivery writes NO stock movement

── Idempotency (F5) ───────────────────────────────────────────────
  ok   re-delivering is a no-op, not an error
  ok   paidAt is not re-stamped

── Cancel before shipping ─────────────────────────────────────────
  ok   the reservation is released
  ok   NO movement is written — nothing moved

── Return after shipping ──────────────────────────────────────────
  ok   a RETURN movement is written
  ok   stock comes back
  ok   a refused order stays UNPAID

── Refusals the machine must make ─────────────────────────────────
  ok   a customer cannot ship
  ok   oversell is rejected

── Reservation sweep (§8.3) ───────────────────────────────────────
  ok   the sweep releases the reservation             8 -> 3
  ok   the sweep does NOT cancel the order
  ok   the sweep audits what it did
  ok   the window comes from SystemSetting
  ok   a second sweep does nothing (idempotent)

── The ledger invariant ───────────────────────────────────────────
  ok   sum(movements) == onHand for every product     0 product(s) drift
```

## 3. A CHECK constraint from P1 caught a real bug

The first verification run failed on `stock_levels_on_hand_non_negative` while shipping.

`recordMovement` applied the level with `upsert`, putting the movement quantity in the CREATE
branch. **PostgreSQL evaluates CHECK constraints on the proposed insert tuple before resolving
the conflict**, so an outbound movement of `-3` failed even though the row existed and the real
answer was 4997.

The deeper defect is what the constraint prevented: on a product with **no** level row yet, that
create branch would have succeeded and written `onHand = -3` — negative stock, silently, from a
sale of goods never received.

`migrate diff` cannot see these constraints (A22) and neither can the type checker. This one
caught a data-integrity bug that an `upsert` would have hidden indefinitely. Fixed by ensuring
the row at 0 and then incrementing; selling stock you do not have still fails, correctly.

## 4. Four cancellation paths, not three

§13.2 names three inventory-mutation paths. There were three for mutation and **four**
implementations of "cancel an order", each carrying its own copy of the rules — and two had
already drifted onto statuses the schema no longer has (`processing`, `fulfilled`). One had a
plain `$transaction` with no isolation level against the storefront's Serializable one, and
inferred "admin" from an argument being absent rather than from a role.

All four now call `transitionOrder` (A49).

## 5. What landed

| | |
|---|---|
| `packages/database/order-state-machine.ts` | The transition table, `settlePaymentForDelivery` (F4), audit with `actorType` (F1), idempotency (F5) |
| `packages/database/reporting.ts` | Valuation, movement history, stocktake variance, sell-through, dead stock, margin, COD refusal rate |
| `packages/database/inventory.ts` | `+ countLowStock`, `listLowStock`, `sweepExpiredReservations` |
| `apps/www/lib/services/order-transitions.ts` | Binds the machine to the outbox, in its transaction |
| `apps/www/app/api/cron/reservation-sweep` | Hourly, `INVENTORY_SWEEP_CRON_SECRET`, in `vercel.json` |
| `apps/admin/lib/services/inventory-service.ts` | ADJUSTMENT / DAMAGE / PURCHASE_RECEIPT — **stock is never an editable number** (§24.3) |

## 6. Two things the reports refuse to do

**They will not invent a number.** `stockValuation` and `grossMargin` return
`{ available: false, reason: "opening-count-pending" }` while N1's flag is set, and
`"cost-not-recorded"` if any stock carries no cost. All 189 opening balances are the seeded
5000 with `unitCost = null` — a valuation computed from them is fiction, and a fiction with a
currency symbol is worse than a blank.

**They will not average in a zero.** `receivePurchase` recomputes weighted average from
receipts that carry a cost, excluding the null ones — averaging a null-as-zero is how a cost
drifts silently toward nothing.

## 7. Gates

```
lint     4 packages, 0 errors
budget   @repo/database 0 · www 0 · admin 97 (was 99) · @repo/mail 0
chain    replaying every migration reproduces schema.prisma exactly, 4 check constraints present
```

The ratchet caught admin dropping to 97 on its own again — collapsing its cancellation path and
routing its low-stock reads through the ledger cleared two more.

## 8. What P4 starts from

- The state machine is a table plus one function, which is what makes §25's "every illegal
  transition rejected" a loop over `TRANSITIONS` rather than a hand-written matrix.
- The ledger invariant (`sum(movements) == onHand`) already has a query behind it in
  `reporting.stocktakeVariance`, so the §25 property test is a call, not a new fixture.
- The verification script this phase ran is the shape of those tests; it was deleted rather
  than committed because P4 is where a test suite with a disposable database belongs.
