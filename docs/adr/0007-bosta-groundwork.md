# ADR 0007 — Bosta: five foundations now, the integration later

Status: accepted · 2026-09-06

## Context

Production carries `shipments`, `shipment_events` and three shipping enums
(`shipment_status`, `shipment_event_source`, `shipping_provider` = `BOSTA`) with **0 rows and
no code**, in neither `schema.prisma` nor anything that reads or writes them. The owner has
confirmed Bosta is coming, but not now.

Keeping empty tables for an unbuilt integration means every future reader has to work out
whether they are live. Deleting them and thinking no further means retrofitting attribution
and payment semantics onto a system that has already accumulated history.

## Decision

**Drop the orphan tables and enums in the baseline-to-v2 chain** (migration `0010`), and ship
exactly five foundations — each cheap today, expensive to retrofit:

- **F1 — Transition source attribution.** Every order status transition records `actorType`
  (`CUSTOMER | ADMIN | SYSTEM | WEBHOOK`) alongside the actor id.
- **F2 — Non-human actors from day one.** Transitions are declared as
  `(from, to, allowedActorTypes)`, with `webhook` in the enum before anything emits it. A
  machine written assuming only customers and admins means reworking authorization on every
  transition later, instead of adding one row.
- **F3 — No courier data on `Order`.** No `bostaDeliveryId`, no `courierStatus`, no
  `deliveryAttempts`. One order can have several delivery attempts, so a courier integration
  needs its own `Shipment` / `ShipmentEvent` pair — additive if `Order` stays clean.
- **F4 — `PaymentStatus.PAID` is not overloaded.** See ADR 0005. The delivery→payment mapping
  lives in `settlePaymentForDelivery(order)` alone, so `COLLECTED` and `SETTLED` become an
  enum addition rather than a semantic rewrite.
- **F5 — Idempotent transitions.** Couriers retry webhooks; a retried delivery event must not
  apply payment or stock twice. Designed and tested as a guarantee of the state machine.

## Explicitly deferred

`Shipment` / `ShipmentEvent` models, webhook endpoints, the Bosta API client, label printing,
rate lookup, settlement reconciliation, courier fee accounting.

Whoever picks that workstream up starts from F1–F5 already in place, and should read this ADR
and 0005 before adding a column to `Order`.
