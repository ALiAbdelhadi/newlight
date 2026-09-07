# ADR 0005 — Order transitions are a declared state machine, attributable and idempotent

Status: accepted, to be implemented in P3b · 2026-09-06

## Context

`updateOrderStatus` accepts **any of the seven statuses from any authenticated user who owns
the order**, and sets `shippedAt` / `deliveredAt` accordingly. The only check is
`where: { id, userId }` — ownership is verified, role is not. A customer can mark their own
order `delivered`.

There is also no record of who caused a transition, and three of the seven statuses were
never assigned by anything.

## Decision

- Transitions are declared **in one place** as `(from, to, allowedActorTypes)`, enforced in
  the service. `cancelOrder`'s whitelist folds into it. Customers may only cancel their own
  order; every other transition requires an admin.
- **`actorType` from day one** (F1), including `WEBHOOK` even though nothing emits it yet
  (F2). Retrofitting attribution after transitions exist means backfilling history that was
  never recorded, and a courier event added later would otherwise be indistinguishable from
  an admin's click.
- **`OrderStatus` is pruned to four values.** `processing`, `fulfilled` and `refunded` were
  reachable by nothing. A status nothing can reach is a status every reader still handles.
- **`PaymentStatus.PAID` means money received by the merchant, nothing weaker** (F4). Under
  manual COD, delivery confirmation means the owner has the cash. Under a courier, delivery
  means the *courier* collected it and the money arrives days later minus fees — a different
  fact, and the one that reconciles against a bank account. The delivery→payment mapping
  therefore lives in exactly one function, `settlePaymentForDelivery(order)`, invoked by the
  state machine and **never inlined into the `delivered` transition**. Adding `COLLECTED` and
  `SETTLED` later is then an enum addition rather than a semantic rewrite of every call site.
- **Transitions are idempotent as a property of the machine** (F5), not as a UI double-click
  guard. A retried delivery event must not apply payment or stock twice.
- **No courier columns on `Order`** (F3). It keeps only what manual COD uses: `shippedAt`,
  `deliveredAt`, `trackingNumber`. One order can have several delivery attempts, so a courier
  integration needs its own `Shipment` / `ShipmentEvent` pair — purely additive if `Order`
  stays clean, and a column migration plus a read rewrite if it does not.

## Consequences

- Every status mutation goes through the machine, including the admin panel's.
- Stock effects hang off transitions, not off the UI: reserve on create, `SALE` on `shipped`,
  `RETURN` on refusal, release on cancel.
- The 4 production orders are all `cancelled` with 0 items, so there is no history to
  migrate and no legacy status to accommodate.
