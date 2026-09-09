# ADR 0009 — Discounts are an overlay on the price, not a write to it

Status: accepted, implemented in P4.5 · 2026-09-07

## Context

The panel had one pricing tool: bulk repricing (§13.2 item 1), which writes a new number into
`products.price` and records the change in the audit log. It is the right tool for what it is
for — the owner repriced 189 products in three tiers with it — but it is the only tool, so
"take 15% off the spotlights until the end of the month" had to be run through it twice: once
to drop the prices, and once, by hand, on the right day, to put them back.

That has three failure modes, and two of them are silent:

- **the second repricing never happens**, and the sale becomes the price;
- **the "was" price is destroyed**, so the storefront cannot show "was 1000, now 850" — the
  single most effective thing a discount does; and
- **price history stops meaning anything.** §3 derives it from the audit log, so a fortnight's
  sale puts two entries in every affected product's history for a price it never really had.

Amendment A21 anticipated this. It dropped `ProductConfiguration.discount` — one of three
always-zero money columns inherited from v1 — with the note that *when discounts arrive they
should be designed, not inherited*.

## Decision

**A discount is a row with a scope and a window. `products.price` is never written by one.**

- **`discounts` (migration 0015)** carries a scope (`ALL` / `CATEGORY` / `SUB_CATEGORY` /
  `FAMILY` / `PRODUCTS`), an amount (`PERCENT` or `AMOUNT`), and a half-open window
  `[startsAt, endsAt)`. `discount_products` names the SKUs of a `PRODUCTS`-scoped discount, so
  "these four, half price, for a week" is one row and not four.
- **Expiry is a fact about time, not a job.** `now()` outside the window IS the end of the
  discount. There is no cron to fail, and nothing to remember to undo.
- **`packages/database/pricing.ts` is the only resolver.** The storefront, the search, the
  cart, the configuration, the order and the admin preview all call
  `resolveEffectivePrice(price, product, discounts)`. A second implementation is how a tile
  says 850 and a checkout charges 1000.
- **Discounts do not stack.** Where several apply, the customer gets the single best one; a tie
  goes to the narrower scope. Stacking is how −20% and −30% become 44% off and no one can
  explain the invoice.
- **The effective price is never zero or below.** `MIN_EFFECTIVE_PRICE` clamps it, and the
  admin refuses to create an `AMOUNT` discount larger than the cheapest product in scope,
  naming the SKUs.
- **The scope column cannot disagree with its target.** A CHECK constraint enforces it, because
  a row that says `SUB_CATEGORY` while carrying a `familyId` would make the resolver's guess,
  not the data, decide what a customer pays.
- **A price is resolved again when the order is created.** The configuration is re-priced on
  every read, and `OrderService.createOrder` resolves once more inside its transaction — what
  is charged is what the catalogue says at the instant of the charge.
- **Stopped, not deleted.** Ending a discount early sets `isActive = false`; only a discount
  that never started can be deleted. An order placed under a discount has to stay explicable
  after it is over.

## Consequences

- **Every read path pays one query.** `loadActiveDiscounts` returns the whole live set — a
  handful of rows — and `apps/www/lib/discounts.ts` wraps it in React `cache`, so it is one
  query per request rather than one per tile. It also captures `new Date()` once, so a page
  rendered across the second a discount expires cannot show two tiles on sale and two not.
- **A scheduled discount appears on cached pages late.** Listing pages revalidate every two
  hours and product pages every hour, so a discount that starts at midnight becomes visible up
  to that long afterwards. What is CHARGED is never stale — the configure and checkout paths
  are `force-dynamic` — and creating or stopping a discount calls `revalidateStorefront`, so
  the delay only affects a discount whose start is in the future. Lowering those windows is the
  fix if it ever matters; making the pages dynamic is not.
- **`CartItem.price` on the wire is now the discounted unit price**, with `basePrice` beside
  it. The old `discount: number` percentage the sidebar multiplied by is gone: the client is
  told the two prices, not a rule for deriving one from the other.
- **Bulk repricing is unchanged and still the right tool for a permanent change.** The two
  screens are siblings under Pricing, and the discount service refuses a window longer than
  400 days rather than becoming a slow way to reprice.

## Addendum — announcing an offer (same day)

A discount nobody finds is a price cut given away for nothing, so three surfaces announce one,
and all three are DERIVED from the same live set rather than curated:

- **A section banner** on a category and sub-category listing, naming that section — "Up to 20%
  off Magnetic Track · 25 products · ends 9 September". Rendered from the server page above the
  listing component, so it reads as a statement about the section rather than as a tile.
- **A site-wide strip** above the header, present only while something is discounted. Its
  height is published as `--announcement-height` on the layout wrapper; the header's `top` and
  the content's padding both read it, and it is `0px` the rest of the time — so the strip
  appearing is one number changing in one place. It is deliberately NOT dismissible: per-viewer
  dismissal means either a flash of a strip that vanishes on hydration or a header height that
  changes after first paint.
- **`/offers`**, everything on offer grouped by section, at `revalidate = 900` because the page's
  whole subject is a deadline. The nav link to it appears only while offers exist.

Two rules the first browser pass produced, both of which are about not lying:

- **The count is one per FAMILY, not per SKU.** A listing shows one card per family (§6), so a
  banner counting SKUs said "77 products" over a grid of 25. A count that disagrees with the
  page under it is worse than no count.
- **"Up to"** is exact rather than promotional: a fixed-amount discount is a different
  percentage on every product it touches, and the banner shows the best one it can actually
  honour.

It also exposed a formatter bug that predates discounts and only became visible with them:
`formatMoney`'s `auto` mode set `minimumFractionDigits: 0`, so 449 less 20% rendered as
"EGP 359.2". Cents are all-or-nothing — `money.ts` now shows both or neither, with a test.
