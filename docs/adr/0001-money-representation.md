# ADR 0001 — Money is Decimal in the database and a string on the wire

Status: accepted, implemented in P1 · 2026-09-06

## Context

Every monetary column in v1 was `double precision`, and every calculation over it happened in
JavaScript `number`. Both are binary floating point, which cannot represent 0.10 — so a cart
of ten 0.10 items is not 1.00, and a total assembled from several such lines drifts in a way
that is invisible until a customer notices.

There was no shared formatter either: `apps/www` formatted prices inline in about ten files,
`apps/admin` had its own `formatPrice` hardcoded to `en-US`, and nothing agreed on how EGP
should render in Arabic.

## Decision

- Columns are `Decimal @db.Decimal(12,2)` (migration `0001`), with a
  `products_price_positive` CHECK constraint.
- `packages/database/money.ts` is the ONLY module that touches `Prisma.Decimal`. It owns
  parsing, arithmetic, comparison, rounding and formatting.
- **Rounding happens once**, at the point a value is stored or displayed. `multiplyMoney` is
  deliberately unrounded so a line total is not rounded and then rounded again inside an
  order total.
- **Server → client transfer is always a string.** React cannot serialise a `Decimal` across
  a server-component boundary; it arrives as a plain object with no methods, and `Number(...)`
  on it is exactly how the precision gets lost again. `serializeMoney` / `parseMoney` are the
  crossing.
- Formatting is locale-aware through `Intl`, with `ar-EG` and `en-US` pinned by
  `intlLocale()` — `ar` alone renders Arabic-Indic digits in some runtimes and not others.

## Consequences

- A `number` can still enter the domain through `money()`, because Prisma's own inputs and
  existing JSON allow it. Decimal parses it via its shortest decimal representation, so 0.1
  arrives as 0.1. It remains the wrong type to compute in.
- Every price-rendering call site in both apps has to move onto this module. That is P3 and
  P5 work and is part of why those packages carry a type-error budget.
- `Decimal(12,2)` caps a single amount at 9,999,999,999.99. The most expensive product is
  13,531 EGP.
