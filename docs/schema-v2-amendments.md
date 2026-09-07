# Newlight Schema v2 — BUILD spec amendments

Binding amendments to the BUILD prompt, from the plan report and the round‑2 answers.
Where an amendment contradicts the original BUILD text, **this file wins**.

Status: adopted 2026-09-06. Applies from P0 onward.

---

## A1. P0 is a real phase (new)

`pnpm check-types` executed zero tasks and exited 0, so every phase exit criterion in
§0.2 was vacuous; `pnpm lint` failed at baseline, so §0.2 was also unsatisfiable.
Both are spec defects. P0 ships before P1 and repairs the gate itself.

P0 additionally installs `scripts/assert-turbo-tasks.mjs`, which fails the run when a
turbo task would execute in fewer than N packages. `pnpm check-types` and `pnpm lint`
both invoke it. **A task that runs nowhere must never again exit 0.**

## A2. §0.1 exemptions must be narrow, documented and dated

`packages/database/eslint.config.mjs` deliberately does not extend
`@repo/eslint-config/base`: that config loads `eslint-plugin-only-warn`, which
downgrades every error to a warning and cannot fail. The only `no-explicit-any`
relaxation is `scripts/seed.ts`, scoped to that one file, and it is deleted together
with the file in P1.

## A3. §1.4 / §19 — the empty-specification SKU list is 14, not 13

Production supersedes the spec. `nl-wl012` is a legacy-JSON artifact and does not
exist as a product row; `nl-dv-102-100w` and `nl-dv-102-200w` are additional.
Authoritative list:

```
nl-dv-102-100w  nl-dv-102-200w  nl-e1030  nl-e1031  nl-e1032
nl-f012         nl-r1015        nl-r1018  nl-r1021  nl-r107c3
nl-z1001        nl-z1003        nl-z1005  nl-z1007
```

## A4. §7 — SpecDefinition label source

`apps/www/lib/product.ts` contains no label map; the only bilingual map is in the
dead `apps/www/lib/product-specifications.ts`. Resolution:

- `labelAr` ← the Arabic JSON keys in `ProductTranslation.specifications`; they *are*
  the display labels. Normalised: strip the stray `°` from `زاوية الإضاءة°`, strip the
  `(w)` unit marker from `أقصى قوة كهربائية (w)`, trim whitespace, correct orthography.
- `labelEn` ← written from the English JSON keys, borrowing exactly four wordings from
  the dead map: `IP Rating`, `Max IP Rating`, `CRI`, `Brand of LED`. Nothing else is
  resurrected from that file.
- `order` ← position in `PREFERRED_SPEC_ORDER` (`apps/www/lib/product.ts`), which is
  live code. `lighting_type` is absent there and is placed by hand at 5.

Three corrections to the first proposal, all defects rather than preferences:

- **`ip_rating` / `max_ip_rating` are `TEXT`, not `NUMBER`.** The prefix is part of the
  value: the row must read `IP20`, not `IP Rating: 20`. `valueEn` and `valueAr` both
  hold `"IP20"`. The transform coerces production's numeric `IP: 20` / `maxIP: 44` on
  the way in and records the coercion in its report. This also matches §21's planned
  `valueEn IN (…)` filter.
- **`SpecDefinition.unit` is replaced by `unitEn` / `unitAr`.** A single column cannot
  hold `hours` / `ساعة`. Symbol units (`W`, `V`, `lm`, `°`, `mm`) simply repeat across
  both, which is fine and honest.
- **`luminous_flux.labelAr` is `التدفق الضوئي`, not `اللومن`.** `اللومن` is the unit,
  which already lives in `unitAr` as `lm`; using it as the label renders
  "اللومن: 3000 lm". Same class of correction as `القصوي → القصوى`.
- **`voltage` is `Input Voltage` / `جهد الدخل`.** Values are `AC 220V`; this is the
  operating voltage and both languages should say so. The displayed Arabic changes from
  `المدخل` — a deliberate label change, noted in the transform report, not a data change.

`سمك العود` (8 track SKUs) merges into the canonical `product_dimensions` key. The 8
SKUs are listed in the transform report so the loss of the more specific Arabic label
is visible rather than silent.

## A5. §15.2 — media resolution (revised after the nl-blade investigation)

**`apps/admin/public/products` is not a duplicate of `apps/www/public/products`.**
It holds 29 files that exist nowhere else, including every `nl-blade` file. The media
walker therefore resolves against the **union** of both trees — exact filename match
first, override only as a fallback. That reduced the 17 unresolved paths to 9 union
hits, 3 overrides and 5 files with no source anywhere.

Overrides live in a committed, reviewable
`packages/database/data/media-overrides.json`, never in source catalog values (so §0.5
holds). Every entry carries a justification; applied overrides and union hits taken
from the admin tree are both printed in the transform report, never applied silently.
The §15.2 gate stays red until the 5 missing files land, and P1 does not exit while it
is red.

**This supersedes the §3 locked decision "Admin duplicate images — delete after
Cloudinary verification."** The premise is false: deleting that tree destroys the only
copy of 29 images, including all photography for `nl-s-l-2-7*7-cm`. Deletion may only
happen after Cloudinary holds the union, verified per file.

**Extension metadata is unreliable and must never be trusted for content type.** 20
files across the two trees have an extension that contradicts their magic bytes (14
`.png` that are JPEG, 6 `.png` that are WebP). Cloudinary public IDs derive from the
path; content type derives from sniffing the bytes.

## A6. §9.2 / §14.6 — Arabic taxonomy slugs are generated

Normalisation rule: **a hamza-bearing letter reduces to its carrier** —
`أ إ آ ٱ → ا`, `ئ → ي`, `ؤ → و`, `ى → ي`, plus `ة → ه`. Bare `ء` has no carrier and is
left intact; mapping it to `ا` turns `إضاءة` into `اضااه` and contradicts the approved
reference output `اضاءه-cob`.

Slugified from the Arabic names, percent-encoded at the URL boundary. Latin fragments
stay inline and lowercased (`إضاءة COB` → `اضاءه-cob`); they are not transliterated,
because the market searches for those terms in Latin script. `×` normalises to `x` in
the slug only — display names are untouched. Trailing whitespace is trimmed for slug
generation (a slug derived from an untrimmed name is a defect in new data, so this is
the one exception to A9).

## A7. §12 / Q6a — Bosta groundwork, and nothing more

`shipments`, `shipment_events`, `shipment_status`, `shipment_event_source` and
`shipping_provider` exist in production with 0 rows and no code. They are dropped in
the baseline-to-v2 chain. Bosta is confirmed as a future workstream, so five
foundations ship now and nothing else:

- **F1** Every order status transition records `actorType`
  (`customer | admin | system | webhook`) alongside the actor id.
- **F2** The state machine is declared as `(from, to, allowedActorTypes)`. `webhook`
  is in the enum from day one even though nothing emits it.
- **F3** No courier columns on `Order`. It keeps only what manual COD uses:
  `shippedAt`, `deliveredAt`, `trackingNumber`. A future `Shipment` / `ShipmentEvent`
  pair is then purely additive.
- **F4** `PAID` means **money received by the merchant**, nothing weaker. The
  delivery→payment mapping lives in exactly one function,
  `settlePaymentForDelivery(order)`, invoked by the state machine and never inlined
  into the `delivered` transition, so adding `COLLECTED` / `SETTLED` later is an enum
  addition rather than a semantic rewrite.
- **F5** Transitions are idempotent as a property of the state machine, not as a UI
  double-click guard. A retried delivery event must not apply payment or stock twice.

Explicitly deferred, recorded so the next workstream knows what already exists:
`Shipment` / `ShipmentEvent` models, webhook endpoints, Bosta API client, label
printing, rate lookup, settlement reconciliation, courier fee accounting.

## A8. Q6b — push notification is removed, not repaired

`PushSubscription`, `web-push`, the VAPID variables, `apps/www/app/action.ts` and both
service-worker push handlers are deleted. The channel queried a `push_subscriptions`
table that does not exist in production and nothing in the app ever subscribed, so it
could never deliver. The admin contact notification moves to the §16 `EmailOutbox`
template in P2; `apps/www/app/[locale]/api/contact/route.ts` carries a `TODO(P2)`
until then. Customer-facing push, if wanted later, is a greenfield addition on the
notification model — not a resurrection of this.

## A9. N1–N4 — audit-driven decisions

- **N1 Opening inventory is fiction and the ledger says so.** All 189 products carry a
  seeded `inventory = 5000`. The transform writes 189 `INITIAL` movements at 5000 with
  `unitCost = null` and a mandatory reason
  `"migrated placeholder — not a physical count"`, plus a `SystemSetting` flag
  `inventory.opening_count_pending = true`. While that flag is set, stock valuation and
  margin reports render "opening count pending" rather than a number, and the admin
  inventory screen shows a persistent banner. The first real stocktake clears it. The
  opening stocktake is a **P5 deliverable**, not optional.
- **N2 `isFeatured` is false on all 189 rows.** Carried across unchanged; flagged in the
  P3 report so the empty featured surface is a deliberate choice.
- **N3 Product SEO metadata is empty on 378/378 rows.** Activation may require `name` in
  both locales (100% pass) and must not require meta fields (0% pass). P3 decides
  explicitly, in an ADR, whether the stored fields become the source with a generated
  fallback or stay unused — one mechanism, not two.
- **N5 Catalog data-quality queue (P5), reported not fixed.** (a) `high-pay` is a typo
  for `high-bay`; the Arabic `إضاءة المستودعات` confirms the intent. It is a live English
  slug, so correcting it needs a `TaxonomySlugHistory` redirect row. (b) `dustproof-led`
  has a mismatched Arabic name — English says "dustproof LED", Arabic says
  `كشافات 2×120 Cm`, a size rather than a category; one of the two is wrong. (c) The
  `nl-s-l-2` family groups three visually unrelated fixtures (a tall black blade, a white
  louvered square, a round black light) under `variantType = dimensions`, so a variant
  selector labelled "5*5 / 5*7 / 7*7 cm" will show three different products. Grouping by
  production `baseProductId` is locked by §1.5 and stays; the presentation problem is
  queued.
- **N4 Spec data defects are reported, never repaired.** The two `false` booleans
  (`nl-strip-2835-19w`, `nl-strip-2835-24w` on `beam_angle` and `main_material`), the 9
  whitespace-only `main_material` divergences, `hole_size` = `"-"` on 151/167 and
  `luminous_flux` = `"-"` on 34/91 all carry across verbatim and become a P5
  data-quality queue. A migration that quietly improves data is one whose output cannot
  be verified against its input. The sole exception is A6's trailing-whitespace trim for
  slug generation.

## A10. §5.5 — cutover is Neon branch promotion

Option A. The transformed branch is promoted; the old production endpoint becomes the
rollback branch and rollback is an endpoint swap. Justified by 11 MB, a static catalog
and a mutable set of 1 user / 4 cancelled orders / 0 order items, so re-transforming
from a fresh snapshot immediately before promotion costs nothing. ADR required.

## A11. §21 — search rewrite scope

`ProductSpec` queries read `valueEn` only, preserving current semantics exactly and
keeping the equivalence proof intact. Arabic spec-value search is a separate opt-in
change. `colorTemp` and `ipRating` — declared in `advancedSearchProducts` today and
never applied — are implemented, with the delta asserted in the equivalence report
rather than tolerated.

## A12. §0.6 — no fabricated rollback SQL

Additive migrations are schema-reversible. The destructive
`0011_drop_v1_catalog_columns` is not, and its recovery path is documented as
PITR/restore. No down-SQL is written merely to satisfy a checklist.

## A13. §20 / P6 — open and blocking, scoped

Neon PITR retention is confirmed by the owner from the console; it is not readable
from this environment. §20 condition 5 and P6 step 2 stay open and block only those
steps. The legacy JSON stays in the repository until all seven §20 conditions close,
and the export script's existence is not sufficient — condition 7 requires a proven
restore into an empty branch.

## A14. §28 — `DIRECT_DATABASE_URL` before the first migration

All six `.env` files point `DATABASE_URL` at a Neon pooler endpoint and the datasource
declares no `directUrl`. Prisma Migrate runs over the unpooled endpoint. Non-negotiable.

## A15. §0.2 during P1–P5 — a ratcheting error budget (ADOPTED by default, reversible)

The v2 schema lands in P1, but the storefront is adapted in P3 and the admin in P5.
So §26's phase plan and §0.2's "check-types must pass" cannot both hold during P1–P2:
the moment `0011_drop_v1_catalog_columns` is expressed in `schema.prisma`, the apps
stop compiling. Measured immediately after the v2 schema landed: **138 errors in `www`,
100 in `admin`, 0 in `@repo/database`**, all from removed columns
(`images`, `inventory`, `availableColors`, the 15 spec columns, taxonomy `slug`,
`categoryType`, `baseProductId`, `selectedColor`, `Configuration.key`,
`OrderStatus.processing`).

Proposed resolution: `scripts/verification-budget.json` gives each package a ceiling
that may only ever decrease, enforced by `scripts/assert-type-budget.mjs`. A regression
fails the build exactly as a red gate would; planned, phased repair does not. The script
also fails when a package drops *below* its ceiling, so a budget cannot quietly stop
biting — it caught its own staleness the first time it ran.

- `pnpm check-types` → task-count guard + budget. This is the gate for P1–P5.
- `pnpm check-types:full` → `turbo run check-types`. Must pass at P5 exit, when every
  budget is 0 and the two commands become equivalent.

Exit ceilings: `@repo/database` 0 from P1; `www` 0 at P3 exit; `admin` 0 at P5 exit.

The alternatives, both rejected: pulling most of P3 and P5 into P1, which discards the
phase plan; or keeping the v1 columns alongside v2 until P3, which §2.1 forbids and
which would double the transform.

**Adopted by default on 2026-09-06** when P1 was told to continue without an explicit
answer. To reverse it, set both app budgets to 0 and do the §26 app adaptation inside
P1; nothing else in P1 depends on the choice, and the budget file is the only thing that
would need deleting.

## A16. The branch was empty; it is now a snapshot of production (new)

`ep-raspy-night` held **zero tables** — it is a separate Neon database, not a
copy-on-write branch of `ep-round-river`. The migration chain therefore had nowhere to
run in place, and A10's "the transformed branch is promoted" had nothing to transform.

Resolved by `pg_dump --schema=public` from production (a read) restored into the branch
(a write to the designated writable target). The branch now holds the production shape
and all of its data — 189 products, 378 translations, 1 user, 4 orders, 0 order items,
13 configurations — so the chain runs exactly where it will run at cutover, against real
data, rather than against an empty shape that proves nothing.

Production's `_prisma_migrations` table is **empty**: it was built with `db push` and has
never been migrated. `0000_baseline_production` gives the chain a real starting point and
is recorded, never executed, against a database that already holds that shape.

## A17. `configurations.productId` never held a product id (new defect, repaired)

All 13 production configuration rows store a **SKU** in `configurations."productId"`. It
joins to `products."productId"` 13/13 and to `products."id"` **0/13**. There was no
foreign key to catch it, so v1's `Configuration -> Product` relation resolved for zero
rows: anything that loaded a configuration's product got nothing.

Q4 asked for a real FK plus a denormalised `productSku`, which is exactly the repair.
`0010` renames the column to `productSku` (what it always was), resolves a real
`productId` through it, asserts every row resolved, and only then adds the FK. The assert
is in the migration, so the same defect in different data stops the migration instead of
producing a table with a FK that is true by luck.

## A18. P1 exits with `0011` deliberately unapplied (new)

`0011_drop_v1_catalog_columns` destroys the data the P2 transform reads. `prisma migrate
deploy` applies everything pending, so the chain cannot be deployed in one call. P1 exits
with `0000`–`0010` applied and `0011` pending, and `pnpm db:migrate:to <name>` applies up
to a named migration (wrapping each in a transaction, since `prisma db execute` does not).

The ordering is enforced rather than documented: `0011` counts products against
`product_specs` / `product_images` and raises if the transform has not run. Verified —
running it against the branch today fails with
`refusing to drop v1 catalog columns: 189 product(s) exist but product_specs=0 and product_images=0`.

## A19. `@repo/eslint-config` and `product-specifications.ts` are deleted (new)

`@repo/eslint-config` had zero consumers after `only-warn` was removed from it in P1 —
neither app nor package extends it. `apps/www/lib/product-specifications.ts` had zero
importers; the four English wordings A4 borrows from it (`IP Rating`, `Max IP Rating`,
`CRI`, `Brand of LED`) are now seeded rows in migration `0006`, so the file's last reason
to exist is gone. Both are removed.

---

# Round 3 — corrections after reading the full BUILD spec

Three items below are defects in what P1 shipped, found by checking the built artefacts
against the complete spec rather than against the summary. They are corrected in place:
the chain has never been deployed anywhere real, so an undeployed migration gets edited,
not patched with a follow-up.

## A20. `lighting_type` was at the wrong position

BUILD's approved order scheme is `5, 10, 20 … 140`, spaced by ten so a spec can be inserted
later without renumbering, and `lighting_type` sits at **5 — first**. It was read as
"position 5" and placed sixth, between `main_material` and `cri`. Corrected: all fifteen
`order` values now match the approved table exactly, and `lighting_type` leads the sheet on
the 10 products that carry it.

## A21. `Configuration` → `ProductConfiguration`, and three dead money columns

§3 renames the model and drops `priceIncrease`, `shippingPrice` and `discount` along with
`key` / `description` / `isPublic` / `lampPriceIncrease`. Only the second group was dropped
and the model kept its old name.

Corrected. Verified before dropping: all three money columns are `0.00` on all 13 production
rows, with zero rows holding anything else, and `configPrice = totalPrice` on every row.
Three always-zero money columns advertise a discounting capability the checkout has never
had; when discounts arrive they should be designed, not inherited.

The table is now `product_configurations`, renamed before the column work so every index is
created with its final name.

## A22. The §4.6 check constraints were missing, and Prisma cannot see them

`price > 0`, `onHand >= 0`, `reserved >= 0`, `reserved <= onHand` were not written.

They are now — `products_price_positive` in `0001`, three on `stock_levels` in `0009`.
Verified against the snapshot first: `min(price) = 22`.

**Prisma cannot express a CHECK constraint and `migrate diff` is blind to it**, tested both
directions: a database with the constraint and one without diff as identical. That is
convenient (they never show as drift) and dangerous (nothing would notice one going
missing), so `scripts/verify-chain.mjs` now asserts all four by name against the replayed
chain, after the diff proves the chain equals the schema.

## A23. The §15.2 media gate is GREEN. Nothing needs to be photographed

`scripts/audit-media.ts` resolves every path in `Product.images` and `Product.colorImageMap`
against the union of both public trees plus the committed overrides, and reports rather than
repairs. Result: **377 references, 347 distinct, all resolved.**

```
resolved exact in www    360
resolved exact in admin    9   <- files that exist ONLY in the admin tree
resolved via override      3 mechanical + 4 needs-review
UNRESOLVED                 0
```

This **withdraws the request for five photographs**. `nl-blade (1–5).webp` were never
missing — all five are in `apps/admin/public/products/outdoor/stairs-light/nl-stairs-light-2/`,
under exactly the recorded names.

Two overrides that v2 of the overrides file had withdrawn are **restored**, with the evidence
that settles each:

- **`nl-w-l-5 (5).webp`.** v2 was right about indices 1–4 and wrong about 5. Indices 1–4 exist
  as real `.webp` in the admin tree and must win by exact match — remapping them to www's
  `.png` would have substituted two downscaled images (520×557 and 788×1047 against
  1100×1556). Index 5 has no `.webp` anywhere, and www's `.png` is 1100×1556 — the exact
  dimensions of the rest of that set, so it is the same shoot and the webp conversion simply
  stopped at four.
- **`nl-s-l-2-5*7-cm` ×4.** The referenced directory `nl-stairs-light/` exists in neither
  tree. www's `nl-stairs-light-2/` holds exactly four files named `nl-stairs-light (1)…(4).png`
  — the only such set anywhere (`-1/` has 1–3, `-3/` has 1–2) — matching this product's four
  references by basename and index, referenced by no other product. v2 withdrew it fearing
  the files belong to `7*7-cm`; they do not, because `7*7-cm` resolves independently and
  exactly to admin's `nl-blade (1–5).webp`. The two sets do show the same white louvered
  fixture, which is what two dimension variants of one product look like, and the www set is
  visibly wider than tall against the square `7*7` — consistent with 5×7 against 7×7.

These four carry `confidence: "needs-review"` and print in their own block in the media
report, because they assign photographs to a product. Ali should eyeball them before cutover;
the alternative was a blank product page for a product that has photographs.

**20 files have an extension their magic bytes contradict** (14 `.png` that are JPEG, 6 `.png`
that are WebP). Public IDs derive from the path; content type derives from sniffing.

## A24. `spec-map.ts` and `audit-catalog.ts`

`packages/database/spec-map.ts` is the v1→v2 dictionary: English snake_case keys and Arabic
display-label keys mapped onto 15 canonical keys, the two excluded key pairs named with where
they go instead, per-key expected row counts, and `coerceSpecValue()` — which formats `IP: 20`
into `"IP20"`, derives `valueNumber` from the **English** side only (Arabic values use
Arabic-Indic digits), and flags defects without repairing them.

`scripts/audit-catalog.ts` is §10.3/§19 as a repeatable script: it **asserts** every fact the
transform depends on and exits non-zero when one moves. Run against production today, all
assertions hold — 189 products, `sum(price) = 232454.00`, 14 empty-spec SKUs, all 30 spec-key
counts, 89 families in the 41/22/8/11/6/1 shape, 0 production keys unmapped.

It also confirms the seven slug divergences needing `ProductSlugHistory` rows; the plan
report named six and the seventh is `nl-spike-2 → nl-spike-2-5w`.

---

# Round 4 — the transform, the media pipeline, and the search rewrite

## A25. The transform is IN PLACE on the branch, not production→branch

§18.1 designed the transform as two simultaneous connections: read production, write an empty
branch. That was written when the branch was assumed to be a copy-on-write branch of
production. It is a separate, empty database (A16), and the migration chain ends in
`0011_drop_v1_catalog_columns` — which only means anything if the database it runs against
*has* v1 columns holding data.

So the shape is: restore a production snapshot into the branch, migrate it to `0010` (v1
columns and v2 tables coexisting), transform in place, then `0011`. One connection, no
cross-database copy, and the destructive step is the last thing that happens rather than the
first. §5.5 Option A is unaffected: the transformed branch is still what gets promoted.

`scripts/_guards.ts` from the plan is `scripts/env.mjs` — same job, and it is what every
database command already routes through.

## A26. The catalog has no product names, in either language

**Every one of the 378 `ProductTranslation.name` values is the product's own SKU.** 183 are
the SKU exactly; 188 are the SKU with `*` rendered as `×`; the single remaining row
(`nl-spike-2`) holds a different SKU, `nl-spike-2-5w`. An Arabic reader and an English reader
see the same Latin string, and it is not a name.

Three consequences, none of them repaired here (N4):

- **§14.3's activation rule passes and means nothing.** "Require `name` in both locales" is
  100% satisfied by strings that are not names. Keep the rule; do not mistake it for a
  quality bar.
- **Family names are the SKU stem**, because there is no better source. `ProductFamily`
  translations carry `nl-a603`, `nl-s-l-2` and so on in both locales. Inventing readable
  names would be fabricating catalog data, which §0.5 forbids.
- **This is the largest customer-facing gap in the catalog** and belongs at the top of the
  P5 data-quality queue, above the `high-bay` typo and the `dustproof-led` mismatch.

## A27. Search rewrite — the equivalence report

`apps/www/actions/search.ts` now filters through `ProductSpec`. Eight column predicates
collapse into one correlated `EXISTS` over `specKey IN (…8 keys…) AND valueEn ILIKE '%term%'`.
No filter turned out to be impossible to rewrite, so §21's exception procedure is not invoked
and no column is retained for query convenience.

Three deltas, asserted rather than tolerated:

1. **`colorTemp` and `ipRating` now filter.** Both were declared in the signature,
   destructured, and never used in the `where`. Preserving "current semantics" literally
   would have meant keeping them inert. `ipRating` accepts `"65"` or `"IP65"` and normalises,
   because `0006` stores `IP65`.
2. **Taxonomy slug filters are locale-scoped.** Slugs moved to translation rows with
   `@@unique([locale, slug])`, so `categorySlug` and `subCategorySlug` now resolve through
   `CategoryTranslation` / `SubCategoryTranslation` and the caller must pass the locale it
   means.
3. **`valueAr` is deliberately not searched.** Searching both columns would return a strict
   superset and break the equivalence proof. Arabic spec-value search is a separate opt-in
   change.

The result shape changed in two further ways the P3 call sites must absorb: `price` is a
`SerializedMoney` string (a `Decimal` cannot cross the server/client boundary), and `images`
is an array of `{ url, blurDataUrl, width, height, alt }` rather than raw paths.

`www` fell from 140 to 111 type errors as a result, and the budget was tightened to match.

## A28. The media pipeline is two phases, and the manifest is committed

`media:scan` does everything that needs no credentials — resolving every catalog path,
reading dimensions from file headers, deriving a deterministic `public_id`, hashing — and
writes `data/media-manifest.json` with `provider: "local"`. `media:upload` is then a thin,
resumable pass that fills in `url` and `blurDataUrl`. So the expensive, reviewable half is
done and committed before a byte leaves the machine, and 233 MB is queued behind three
environment variables rather than behind a rewrite.

Details worth keeping:

- **`public_id` derives from the RESOLVED FILE, not the catalog path**, so two catalog paths
  naming one photograph share an id and upload once — which is correct, because
  `colorImageMap` legitimately points several colours at the same image. A collision between
  two *different* files aborts the scan.
- **No Cloudinary SDK.** The upload API is a signed multipart POST; a dependency to make one
  HTTP call would hide the only part worth reading.
- **Dimensions are parsed from PNG/JPEG/WebP headers directly**, with no `sharp`. All 347
  files parse. `width`/`height`/`blurDataUrl` are nullable precisely so rendering never
  blocks on them.
- `media.ts` is the single resolver, shared by the audit gate and the migration. Two answers
  to "which file does this path mean" is the class of defect this project exists to remove.

## A29. `catalog:export` / `catalog:restore` — §20 conditions 2 and 7

The export is the replacement backup and the dev-environment seed. Deterministic ordering, so
two exports of one catalog are byte-identical and a diff between them means something. Money
is a string throughout: a JSON number cannot hold a Decimal without rounding it.

`catalog:restore` exists because condition 7 asks for a **proven** restore, not a script that
could perform one. It refuses to run over a non-empty catalog without `--force`, and it
re-collects and compares counts and the price total against the file it restored from, so the
proof runs every time rather than once.

The legacy JSON files stay untouched until all seven §20 conditions close.

## A30. The transform takes ~15 minutes, and that is a cutover cost

Every write is an individual upsert over the Neon pooler — roughly 3,400 round-trips. Correct
and idempotent, but §5.5 Option A re-transforms from a fresh snapshot immediately before
promotion, so that quarter of an hour lands inside the cutover window. Batching the spec and
image writes into `createMany` with `ON CONFLICT` would cut it to well under a minute. Not
done now: correctness first, and the number is small enough to be a scheduling note rather
than a defect. Recorded so P6 plans for it rather than discovers it.

---

# Round 5 — P2

## A31. `user_role` had to come back as a column

§1.6 lists `UserRole` as dead schema — declared, no field uses it — and P1 dropped it. §7 then
asks for `requireAdmin()`, and there was nothing for it to read: the *only* notion of an
administrator was nine comparisons of `user.emailAddresses[0].emailAddress` against
`process.env.ADMIN_EMAIL`, in nine files.

So `0013` reintroduces `user_role` **with a column this time** (`users.role`, default
`CUSTOMER`, indexed). Dropping it in P1 was still right: what came back is a different thing
that something actually reads.

## A32. The one production user is backfilled, never deleted

Its `email` is `NULL` and Better Auth requires `NOT NULL UNIQUE`. §7 calls the row disposable,
but deleting it is not free: `orders.userId` cascades, so it would take the 4 production orders
with it and break the §18.3 invariant that P1 spent a phase establishing.

`0013` backfills `migrated-<id>@newlight.invalid`. RFC 2606 reserves `.invalid`, so the address
can never resolve — it cannot be accidentally emailed and cannot collide with a real one. No
`accounts` row is created, so the row cannot sign in, which is what "no claim-account flow"
means in practice.

## A33. `OrderQueue` had no callers, so orders sent nothing

§6 says "replace `OrderQueue` rather than porting it", which reads as though something was
running. Nothing was: the class held three `console.log` calls and **zero files imported it**.
The gap was not a stubbed queue, it was an unwired one.

The order confirmation is now queued inside the order-creation transaction, keyed
`order-confirmation:<orderId>`.

## A34. The admin notification reached at most one address

`createAdminNotifications` looked up a single user by `process.env.ADMIN_EMAIL` and returned
silently when nothing matched. A second administrator, or a changed address, meant in-app
notifications that went nowhere and said nothing. It now selects every user whose role is
`ADMIN` or `SUPER_ADMIN` — which is only possible because of A31.

## A35. `packages/mail` is transpiled by two toolchains, and JSX broke under one

Next's SWC uses the automatic JSX runtime; `tsx` — which runs the cron sweep and the scripts —
emits `React.createElement`. Under the second, JSX with no `React` in scope throws
`ReferenceError: React is not defined` **at runtime**, with `tsc --noEmit` completely clean.

Found by rendering a template rather than by compiling one. Fixed with an explicit
`import * as React` in the three `.tsx` files, with the reason written above the import so it
does not get tidied away as redundant.

The outbox classified it correctly on the way past: a template that cannot render will never
render, so the row went to `FAILED` immediately rather than retrying six times.

## A36. The cron sweep lives in `apps/www`, not `packages/database`

It needs both `@repo/database` and `@repo/mail`, and `@repo/mail` already depends on
`@repo/database`. Putting it in the database package would close a cycle between two workspace
packages — which is a build problem waiting for the wrong bundler. §6 asks for a Vercel Cron
sweep anyway, and Vercel Cron routes live in an app.

## A37. Middleware is an optimistic gate, not authorization

Clerk wrapped `intlMiddleware`, so every storefront request paid for an auth check before it
was localised. The replacement inverts that: intl runs for everything, and the session cookie
is read — with `getSessionCookie`, which does **not** touch the database — only for protected
paths.

That is deliberately not the authorization. The real check is `getIdentity()` / `requireAdmin()`
in the page or action, which reads the role from the database. A forged cookie gets past the
middleware and fails there. Middleware runs on every request; a database query there is a
per-request cost for a check the page repeats anyway.

---

# Round 6 — P3

## A38. The category route params were lying, and are renamed

v1's segments were `category/[subCategory]/[sectionType]/[productId]`, where `[subCategory]`
held the **category** slug and `[sectionType]` held the sub-category. Anyone reading a page in
that tree had to already know that.

Those files were being rewritten for per-locale slugs regardless, so the names are corrected
with them: `category/[category]/[subCategory]/[product]`. The product segment is the SLUG now,
not the SKU (§9.3) — a behaviour change, and the seven products whose slug differs from their
SKU 301 through `ProductSlugHistory`. Verified in a browser: `/en/category/indoor/panel/nl-60*60-led`
resolves to the same page as `.../nl-6060-led`.

## A39. Every `as unknown as` cast on a Prisma result is gone

v1's services ended each method with `as unknown as Category` / `as unknown as Product`. That
is why deleting `specifications` from the schema produced no compile error at those call
sites: the cast told the compiler to stop looking.

The service return types are now Prisma payloads derived from the queries themselves
(`Prisma.ProductGetPayload<{ include: ReturnType<typeof productDetailInclude> }>`), and the
components take those types rather than hand-written interfaces in `@/types` that still
declared `categoryType`, `images: string[]` and `price: number`. Shape and type cannot
disagree, because there is only one of them.

`lib/services/selectors.ts` holds the shared include fragments. Composing them is also what
makes §14.4's unfiltered `take: 1` hard to write: a query that spells its include by hand can
forget the locale; one that calls `translationsFor(locale)` cannot.

## A40. Search was hardcoded to English

`SearchService.searchContent` opened with `const searchLocale = "en"` and the API route passed
`"en"` explicitly, under a comment saying so. An Arabic reader searching in Arabic matched
nothing, and the terms that did match came back with English names and English URLs. It is a
parameter now, and the route passes the request's locale.

## A41. One price formatter, for both apps

There were three: about ten inline `Intl.NumberFormat` calls in the storefront, one
`formatNumberWithConversion` used by a single file, and an admin `formatPrice` hardcoded to
`en-US` — so the same order total rendered differently depending on the screen.

`formatMoney(value, locale)` in `@repo/database/money` is now the only one, and it takes
`MoneyInput` rather than `number`, which is the point: a formatter typed on `number` invites
`Number(price)` on a Decimal at every call site and undoes migration 0001 one screen at a
time. Arabic gets Arabic-Indic digits with the symbol after the amount (`١٦٥ ج.م`), which is
how prices are written in Egypt.

Folding it in cleared **12 admin type errors** on its own; restoring the old formatter
measures 111 against 99.

Two places rendered the currency twice afterwards, because a `{t("currency")}` span sat beside
a value that now carries its own symbol. Both were caught by looking at the page, not by
compiling it.

## A42. The silent translation fallback is replaced

`getTranslation` was `translations.find(t => t.locale === locale) || translations[0]`, so a
missing Arabic name rendered the English one indistinguishably and forever — nobody could tell
a translated catalog from an untranslated one by looking at it (§14.2).

It now delegates to `pickTranslation` / `requireTranslation` / `translationFallback` in
`@repo/database`, and **logs when it falls back**. The footer and the category pages omit a row
with no translation in the requested locale and say so, rather than substituting a slug for a
name.

## A43. The footer's two hardcoded columns are gone

It filtered sub-categories into `indoor` and `outdoor` buckets by `categoryType` and linked to
`/category/indoor/...` — both wrong in v2, and the second wrong in Arabic specifically, where
the category slug is `اضاءه-داخليه`. It groups by whatever categories exist and links from the
translation row, so a third category needs no code change.

## A44. `sitemap.ts` and `robots.ts` did not exist

Neither file was in the repository. The sitemap now emits **437 URLs — 220 English, 216 Arabic,
766 hreflang alternates** — with Arabic slugs percent-encoded at the URL boundary and every
product listed under the taxonomy path for its own locale. `robots.txt` points at it and
disallows the per-session configure/confirm/complete states, which have nothing to index and
are each a duplicate of a product page.

## A45. The revalidation endpoint always does both locales

§23's endpoint invalidates by tag first — tags catch listings that embed a product's card,
which a path list misses — and then by path **for every locale**. Revalidating only the path
the admin happened to be looking at is how an English page updates and its Arabic twin does
not, which is the failure mode per-locale slugs otherwise invite.

## A46. Sentry is deferred, deliberately

§26 lists Sentry in P3. It needs a DSN the owner has not supplied and adds a dependency plus
instrumentation to both apps. Rather than half-wire it against a placeholder, it is deferred
with its two variable names named (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`). Analytics likewise.
Both are additive and neither blocks P3b.

---

# Round 7 — P3b

## A47. The state machine lives in `@repo/database`, not in `apps/www`

The P1 plan put `order-state-machine.ts` in the storefront. That was wrong: the ADMIN app
performs most transitions, and a machine declared in one app and re-implemented in the other
is not one machine — which is the whole of F2.

It lives in `packages/database/order-state-machine.ts`, and both apps call it. Because
`@repo/mail` already depends on `@repo/database`, the machine cannot queue email itself; it
takes an `afterTransition` hook that runs **inside its transaction**, and each app supplies
one. So "the status changed" and "the customer was told" stay a single atomic fact without
closing a package cycle.

## A48. `updateOrderStatus` is deleted, not guarded

§12's vulnerability is confirmed verbatim: `updateOrderStatus(orderId, status)` accepted any
of the seven statuses from any authenticated user who owned the order, and set `shippedAt` /
`deliveredAt` to match. Ownership was checked; role was not. Under COD, `delivered` is the
event that settles payment.

The fix is not a role check bolted onto the old signature. **A signature that takes a target
status invites the next caller to pass one**, so the customer-facing action no longer takes one:
`requestOrderCancellation(orderId, reason?)` is the only customer-facing transition there is,
because cancellation is the only transition ADR 0005 lets a CUSTOMER cause. Everything else
runs through the machine with `actorType: ADMIN`.

`updateOrderStatusSchema` is pruned to the four surviving values, so a request carrying
`fulfilled` is refused at the edge rather than reaching the machine to be refused there.

## A49. Three cancellation paths were actually four

§13.2 names three inventory-mutation paths. There were three for *mutation*, but **four**
implementations of "cancel an order", each with its own copy of the rules:

- `apps/www/actions/order.ts` — `updateOrderStatus`, any status, any owner;
- `apps/www/lib/services/order-service.ts` — `cancelOrder`, which still allowed cancelling from
  `processing`, a status 0010 removed;
- `apps/admin/lib/services/order-service.ts` — its own non-cancellable list still naming
  `fulfilled`, a plain `$transaction` with no isolation level against the storefront's
  Serializable one, and ownership inferred from an argument being absent rather than a role;
- `apps/www/app/[locale]/api/orders/create/route.ts` — calling the second.

All four now call `transitionOrder`. Two copies of a state machine are two state machines, and
these had already drifted onto values the schema no longer has.

## A50. A CHECK constraint from P1 caught a real bug in `recordMovement`

The P3b verification run failed on `stock_levels_on_hand_non_negative` while shipping an order.

`recordMovement` applied the level with `upsert`, putting the movement quantity in the CREATE
branch. **PostgreSQL evaluates CHECK constraints on the proposed insert tuple before it
resolves the conflict**, so an outbound movement of `-3` failed the constraint even though the
row already existed and the real result would have been 4997.

The deeper defect is what the constraint prevented: on a product with **no** `stock_levels` row
yet, that create branch would have succeeded and written `onHand = -3` — negative stock,
silently, from a sale of goods never received.

Fixed by splitting it: ensure the row exists at 0, then increment. Selling stock you do not
have still fails, which is correct.

This is the §4.6 constraints earning their place. `migrate diff` cannot see them (A22), the
type checker cannot see them, and this one caught a data-integrity bug that four months of
`upsert` would have hidden.

## A51. The reservation sweep releases stock and refuses to cancel

72 hours by default, from `SystemSetting` (`inventory.reservation_ttl_hours`) so changing it is
a row rather than a deploy. It releases the reservation, audits what it did, and notifies
**every** administrator by role.

It does not cancel the order, and that restraint is the design rather than an omission: an
order sitting four days is usually a customer nobody has called yet, not an abandoned one, and
auto-cancelling would destroy a sale to tidy up a number. What it fixes is that order holding
stock hostage from customers who are ready to buy.

Idempotent twice over — `release()` clamps, and a swept order is skipped by its audit row, so
the notification does not repeat every hour.

## A52. Reporting refuses to give a number it does not have

`stockValuation` and `grossMargin` return `{ available: false, reason }` rather than a figure
while `inventory.opening_count_pending` is set (N1), and again if any product holds stock with
no recorded cost. All 189 opening balances are a seeded placeholder of 5000 with `unitCost =
null`, so any valuation computed from them is fiction — and a fiction with a currency symbol on
it is worse than a blank.

`receivePurchase` recomputes weighted average from receipts **that carry a cost**, excluding
null-cost ones rather than averaging in a zero, which is how a cost silently drifts toward
nothing.

`codRefusalRate` is newly measurable at all: distinguishing a refusal from an ordinary
cancellation requires the RETURN movement, which only exists as of the state machine.

## A53. Low stock was measuring the wrong number

The admin counted `product.inventory < 10` — a dropped column, and the wrong quantity anyway.
`countLowStock` reads `onHand - reserved` from the derived level, so a product with 12 on hand
and 11 reserved is correctly low stock. The old query said it was fine.

---

# Round 8 — P4

## A54. The test database is "any Postgres", not testcontainers

§11 offers testcontainers or a Neon branch per run. The harness takes a **base connection URL**
instead and creates `newlight_test_<random>` on it, because that covers all three: a local
server, a CI service container, or a testcontainer someone else started — and the tests do not
have to know which. Testcontainers needs a running Docker daemon and pulls an image; a Neon
branch per run needs an API key nobody has here.

Each test **file** gets its own database, with the **real migration chain** applied — not
`db push`, which would test a schema no deployment ever produces. `TEST_DATABASE_URL` is the
whole contract.

## A55. Three raw queries compared UTC timestamps against local time

The suite found the same defect three times, in code that reads correctly:

Every timestamp column here is `timestamp(3) WITHOUT time zone` and Prisma writes **UTC** into
them. A bare `now()` is a `timestamptz`, and a JS `Date` passed as a raw parameter arrives as
one too — so comparing either against those columns coerces through the **session timezone**.

On this machine that is `Africa/Cairo`, three hours ahead. The consequences, none of which the
type checker or a review could see:

- **`dispatchOutbox`** claimed every backed-off row immediately, so a failing mail transport
  was retried on every sweep instead of at 1, 5, 15, 60, 360 minutes.
- **`sellThrough`** returned an empty list for any window.
- **`deadStock`** listed every product as dead, including ones that had just sold.

Fixed with `now() AT TIME ZONE 'UTC'` in the outbox claim and a `utcBoundary()` helper in the
reports that renders the boundary as a UTC wall-clock string and casts it `::timestamp`. That
is independent of both the session timezone and how the driver happens to type a `Date`.

Neon defaults to UTC, so this would have hidden in production until a restore or a config
change. It is exactly what §11's "arbitrary sequence" tests are for.

## A56. `ADMIN_ROLES` moved into `@repo/database`

It lived in `apps/admin/lib/auth.ts`, which builds a Better Auth instance at module load and
throws on a missing secret — so nothing could import the roles without starting an auth system.
A test wanting to assert "a signed-in CUSTOMER is not an admin" had to either duplicate the
list or boot the seam.

Roles are a domain fact. `ADMIN_ROLES` and `isAdminRole()` now live beside the `UserRole` enum,
and the admin seam re-exports them.

## A57. Transform fidelity is verified where the data is, not against fixtures

§25 asks for "product count, price sum, translation count and image count match production
exactly; re-running the transform produces an identical result."

That is **not** something a fixture-based test can honestly assert — a fixture with three
products would be testing the fixture. It is verified by `pnpm transform`'s own reconciliation
against the real 189 products, which fails the run if the sum drifts from `232454.00`, and was
executed twice in P1 (the second run proving idempotency: identical counts, `0 INITIAL
movements`).

What the suite covers instead is everything that reconciliation *relies on*: the ledger
invariant under an arbitrary operation sequence, the seeded reference data, the CHECK
constraints `migrate diff` cannot see, and 0011's column removals. `pnpm audit:catalog` remains
the assertion against production itself.

## A58. "Search equivalence" has nothing left to compare against

§25 asks that each rewritten filter "returns the same results as the current column-based
implementation on the same data". Migration `0011` dropped the eight columns that
implementation filtered on, so there is no second implementation to run a differential
against — and re-creating one to test against would be inventing a baseline.

The tests instead assert that each filter returns the **right** rows, and that the three
documented deltas (A27) behave as documented rather than by accident: `colorTemp` and
`ipRating` now filter where they were inert, taxonomy slug filters are locale-scoped, and
`valueAr` is deliberately not searched — that last one asserted by confirming an Arabic value
exists and is not matched.

---

# Round 9 — P5, the admin panel

## A59. `/admin/customers` was never linked; `/admin/shipping` was

§13.2 item 8 lists "sidebar links to non-existent `/admin/customers` and `/admin/shipping`".
Only the second half is true of the code as it stands. `components/sidebar.tsx` links to
`/admin/dashboard`, `/admin/orders`, `/admin/products`, `/admin/users`, `/admin/shipping` and
`/admin/contact` — there is no `customers` entry, and `/admin/users` (which exists, with a
`[userId]` detail route) is the customers screen under a different name.

So the dead link count is one, not two, and no `/admin/customers` route was created: adding a
second name for a screen that already exists is how a tool ends up with two half-maintained
customer lists. `/admin/shipping` was built.

## A60. Shipping rates were a literal in the checkout path, so the Shipping screen had nothing to edit

The dead `/admin/shipping` link was the smaller half of the problem. The three delivery prices
lived as an object literal inside `apps/www/lib/services/order-service.ts`:

```ts
const shippingCosts = { BasicShipping: 50, StandardShipping: 100, ExpressShipping: 200 }
```

A "Shipping" screen that could not change them would have been a screen about shipping rather
than a screen that does anything. They are `SystemSetting` rows now, read through
`packages/database/shipping.ts` by both apps, with those same three numbers as the defaults —
so a database with no rows behaves exactly as the literal did, and nothing about existing
orders changes.

`getShippingRates` never throws: an unparseable or negative stored value falls back to the
default. A shipping rate that raises is a checkout that fails over a configuration gap.

## A61. Money snapshots are asserted, not merely intended

§13.2 item 4 says editing `Product.price` must never rewrite `OrderItem` or
`ProductConfiguration`. Nothing in the code rewrites them, but "nothing does" is a claim about
every future change rather than about this one.

`CatalogService.assertSnapshotsIntact()` is the observable form: it reports every order whose
recorded `subtotal` disagrees with the sum of its own lines. The catalog test proves the
property end to end — an order is placed at 150.00, the product is repriced to 300.00 through
the real bulk editor, the order line still reads 150.00, and the assertion returns `[]`.

## A62. A translation name that equals its own SKU counts as untranslated

A26 established that all 378 `ProductTranslation.name` values are the SKU. A completeness
indicator that counts a non-null name as filled would therefore report a catalog 100%
translated and 0% usable.

`TranslationService` treats `name === sku` (and `""`, and `"-"`) as a placeholder, so the
coverage numbers describe translations rather than rows. The consequence is that the queue on
`/admin/translations` opens showing essentially the whole catalog — which is the true state,
and the point.

## A63. Stock is never an editable number in the UI

§13.2 item 3, stated as a UI rule rather than a service rule. The product workbench has no
"set on hand to 42" field anywhere. There are three forms — correction, damage, goods in —
each of which requires a reason or a cost, and the level follows from the ledger.

A settable on-hand field would have to invent a movement to explain itself, and inventing
movements in an append-only ledger is the failure it exists to prevent.

## A64. Hard delete refuses first, with the blockers named

`OrderItem.productId` is `ON DELETE RESTRICT`, so the database would refuse a hard delete
anyway — as a foreign-key error, at the end, naming a constraint. `CatalogService.hardDelete`
counts order items, cart items, configurations and stock movements first and refuses with all
four numbers, and the UI replaces the button with that sentence rather than disabling it.
Disabled controls that do not say why are how a person concludes the tool is broken.

## A65. The React compiler rejects `Date.now()` in a server component body

`/admin/inventory` computed its 30-day reporting window inline. `Cannot call impure function
during render` is correct: a value that changes between renders of the same tree is not a
prop. The window moved into `InventoryService.reportsForLastDays(days)`, where it is computed
once per request on the server.

Worth recording because the same pattern exists wherever a page wants "the last N days", and
`tsc` says nothing about it — only the lint rule does.

---

# Round 10 — P6, media and cutover preparation

## A66. `media:verify` could not run on the catalog it was meant to verify

`collectReferences` reads v1's `products.images` and `products."colorImageMap"` — the columns
migration `0011` drops. So the moment the branch was fully migrated, the verification step of
the media migration failed with `column "images" does not exist`, and it would have failed the
same way in the cutover window, after the transform, which is exactly when it is wanted.

`verify` now asks whichever question the database it is pointed at can answer: against a v1 or
partially-migrated catalog, "does every referenced path have a manifest entry"; against a v2
one, "does every `product_images` row carry a publicId the manifest knows, and is any of them
still a local path". `collectReferences` itself is unchanged — `media:scan` runs pre-transform
and needs it exactly as it is.

## A67. The catalog is pointed at Cloudinary after the fact, not by re-running the transform

The transform writes `url: entry.url ?? path`, so a catalog transformed while the manifest was
still `local` holds local paths — and it cannot simply be re-run, because `0011` has already
removed the columns it reads.

It does not need to be. The transform also writes `publicId`, which is derived from the file
rather than from Cloudinary, so the rows can be matched to manifest entries afterwards.
`pnpm media:sync` does exactly that and nothing else. Idempotent by construction: the second
run reported `0 updated, 371 already pointing at Cloudinary`.

Result on the branch: 347 files uploaded with 0 failures, 371 catalog images updated, every URL
returning 200, and an Arabic category page rendering 11 Cloudinary images with none broken.

## A68. The transform is NOT batched, deliberately

ADR 0006 notes the transform's ~15 minutes are roughly 3,400 individual round-trips and that
batching would bring it under a minute. It has not been done.

`0011` is applied on the development branch, so the v1 columns the transform reads are gone
there, and a rewrite could not be verified against anything — the only honest check is
reconciling its output against the same production numbers (189 / 2051 / 232454.00), which
requires a fresh snapshot. Rewriting a data transform and verifying it later is how a
migration acquires a defect nobody can attribute. It belongs in a rehearsal run, and the
runbook says so at the point where someone would be tempted.

## A69. The preflight separates what it can verify from what a person must

`pnpm cutover:preflight` is read-only and prints two kinds of row. AUTOMATIC rows are read from
the database, the manifest or the filesystem; a red one is a fact. MANUAL rows — Neon PITR
retention, the in-window restore proof, Resend domain verification, the rotated seed password —
cannot be read from this environment and are printed as OPEN, never inferred.

It never prints "READY". A script that certifies a rollback nobody has checked is worse than no
script, so with every automatic check green it says only that the automatic checks are green
and names the four things still owed.

## A70. §20's legacy JSON is dead code but stays in the repository

`apps/www/data/products-details-{en,ar,static}.json` are referenced by nothing — the preflight
greps for it, which is the one §20 condition that is a fact about the code rather than about a
backup. That condition is closed.

The files stay anyway. A13 holds: all seven conditions, and 5 (PITR retention) and 7 (a restore
proven from an export taken inside the cutover window) are still open. "Nothing imports it" is
not "we can get it back".

## A71. Single-product price editing was missing, and that was my error

P5 shipped the price tab as read-only, with a note saying prices change through the bulk
editor. The reasoning was that one column should have one write path. The conclusion was
wrong: changing one product's price is the most ordinary thing an admin panel does, and
sending someone to a category-wide tool to do it is not a safeguard, it is an obstacle.

`PricingService.setPrice` fixes it without reintroducing the problem the note was worried
about — it builds a `{ kind: "products" }` scope and a `set` formula and runs the real
`preview` → `apply`, so a single edit writes the same audit row as a bulk one and reads back
through `priceHistory`. There is still exactly one write path to `products.price`.

## A72. Specifications were not editable at all

The same P5 omission, larger. The specs tab rendered a read-only table, so the normalised spec
data — the thing §4 exists for — could be read in the admin panel and changed nowhere.

`SpecService` reads from the DEFINITIONS rather than from the rows that happen to exist: every
spec the sub-category declares appears whether or not the product has a value, or a missing
required spec would be invisible and therefore unfillable. A spec the product carries that its
sub-category does not declare appears too, marked — hiding it is how it survives forever.

Writes follow the same typing rules as `coerceSpecValue`, because a spec typed one way by the
migration and another by the admin panel is two schemas:

- `ip_rating` / `max_ip_rating` normalise to `IP<digits>` in both languages — the transform did
  this to 342 values and the storefront filter matches on it
- `NUMBER` fills `valueNumber` when the text parses, and keeps it as text when it does not:
  `12-15` and `220-240` are real datasheet answers, not input errors
- clearing both boxes DELETES the spec, because an empty spec renders as a labelled blank,
  which reads as missing data with extra steps
- an N4 boolean-where-text value is shown with a badge and left alone until someone types over it

---

# Round 11 — what the visual pass found

Five defects, none of which `tsc`, ESLint or the test suite could see. This is what §26's
"look at it in a browser" is for.

## A73. Every admin page threw a hydration error, from one Radix attribute

Radix's `ScrollArea` viewport renders `overflow-x:hidden;overflow-y:hidden` on the server and
`overflow: hidden scroll` once it has measured in the browser. The sidebar uses a ScrollArea,
so EVERY page in the panel logged "Hydration failed because the server rendered HTML didn't
match the client" and re-rendered its whole tree on the client.

The difference is correct — the client knows a scrollbar width the server cannot — so it is
suppressed on that element, one level deep, which is exactly the scope of the problem.

## A74. A query whose result is rendered needs a total order

`/admin/translations` kept throwing a hydration error after A73 was fixed. The cause was a
class of defect rather than a single line: `dataQualityQueue()` and `TranslationService.queue()`
called `findMany` with no `orderBy` and then **printed the first three** (or sliced to 100).

PostgreSQL returns unordered rows in whatever order it likes and need not repeat it, so two
renders of the same request could disagree. Every such query now orders by `productId`, which
is unique and therefore a total order. Ordering that only *looks* like tidiness is load-bearing
the moment a slice or a render depends on it.

## A75. The last hydration error was a stale dev server

After A73 and A74, one page still reported an issue and the overlay's own header said
"Next.js 16.1.6 **(stale)**". Restarting the dev server cleared it, and the server-rendered tree
had genuinely been missing a wrapper element that the source has had all along.

Recorded because two real defects were found while chasing it, and because the next person to
see a hydration error that survives a correct fix should check the overlay's staleness marker
before rewriting more components.

## A76. `EGP` was printed twice on the dashboard

The revenue card had a literal `<span>EGP</span>` in the slot where the other three cards carry
an icon, from before `formatMoney` owned the currency symbol — so it read "EGP … EGP 0". The
fourth instance of the defect P3 fixed in three places; it survived because it is in the admin
app, which P3 did not touch. Replaced with an icon, matching the other cards.

## A77. The admin root was a shared-password gate that protected nothing

`/` rendered a second sign-in — a "role" and an "admin password" posted to `/api/verify-admin`,
which compared them with `===` against `ADMIN_NAME` / `ADMIN_PASSWORD`.

Deleted, not fixed, on three counts:

- **It protected nothing.** Success called `router.push("/admin/dashboard")` on the client;
  anyone already signed in could type that URL instead. Every real page is guarded by
  `requireCurrentAdmin()`, which reads the role from the database.
- **It was a shared secret** in plaintext — one password for every administrator, no rotation,
  no record of who used it, and a distinct 401 that made the endpoint an oracle for guessing it.
- **It was dead.** Neither variable is set in any `.env` file, so it answered 500 and nobody
  could pass it with any password at all.

Same reasoning as §12: a privilege check with no privilege behind it is removed, not guarded.
`/` now redirects to the dashboard.

---

# Round 12 — the cutover rehearsal

## A78. The runbook was wrong, and running it is how that was found

Rehearsing the cutover against a local restore of production failed on its first step:

```
[migrate-to] apply    0000_baseline_production
Error: ERROR: type "available_colors" already exists
```

The restored database already HAS the v1 schema, so `0000_baseline_production` must be
**recorded and not executed** — `migrate-to.mjs --baseline`. P1 did exactly that on the branch;
the runbook I wrote from it omitted the flag, and named migrations as `0010` where the script
requires the full `0010_order_lifecycle_and_configuration`.

Both are fixed, and the sequence is now a script — `pnpm cutover:rehearse` — precisely so the
next defect in it is found by a rehearsal rather than in the window. A runbook nobody has
executed is a hypothesis.

## A79. The transform was never slow; the round trips were

ADR 0006 recorded ~15 minutes for the transform and attributed it to "roughly 3,400 individual
round-trips". The rehearsal measured the same transform, on the same 189 products, against a
local PostgreSQL:

```
transform took 0.9s locally   ·   ~15 minutes against Neon
```

Same code, same data, same row counts — a thousandfold difference. The work is trivial; the
cost is entirely latency × requests. That reframes the fix: fewer requests, or run it closer to
the database.

Both are now available. The per-row `upsert` loops are batched through
`prisma.$transaction([...])` — which pipelines an array of operations into one request, with
each statement unchanged — and the 189 opening-balance movements share one transaction instead
of holding 189. The runbook says plainly that *where* it runs matters more than any further
batching.

The ledger is deliberately **not** batched: `recordMovement` is an interactive transaction
because it reads a level and then writes a movement and that level together, and it is the only
writer of the stock ledger. Going faster by bypassing it would break the invariant it exists to
hold.

## A80. The batched transform is byte-identical in what it produces

A78 is why this could be claimed at all. From the same production dump, restored fresh, the
batched transform reproduces every number the unbatched one did and every number production has:

```
[1/9] taxonomy slugs        54    [6/9] product images       371
[2/9] families              89    [7/9] available colours    208
[3/9] product.familyId     189    [8/9] inventory            189 INITIAL
[4/9] product specs       2051    [9/9] slug history           7
[5/9] sub-category specs   294
  ok  product count 189 · sum(price) 232454.00 · translations 378 · families 89
  ok  taxonomy slugs still null 0 · ledger vs stock_levels drift 0 · INITIAL movements 189
```

and `prisma migrate diff` against the finished database reports **No difference detected**.

One measurement is missing and should be honest about it: the "before" transaction count was
not measured. The batched run commits 387 transactions; the previous figure of ~3,400 is
derived from the code shape and the row counts above, not observed, because the transform is
not yet tracked by git and the original was overwritten in place.

## A81. §20 condition 1 is closed and the files still stay

`apps/www/data/products-details-{en,ar,static}.json` are imported by nothing — the preflight
greps for it on every run, so this is checked rather than remembered.

They stay in the repository. Conditions 5 (PITR retention) and 7 (a restore proven from an
export taken inside the window) are open, and both need a person. "Nothing imports it" is not
"we can get it back".

---

# Round 13 — the storefront pass, and the images gap

## A82. `Decimal` was crossing into Client Components, 231 times a page

The home page logged **231** console errors, all the same one:

> Only plain objects can be passed to Client Components from Server Components. `Decimal`
> objects are not supported.

Three client components — the home product grid, the sub-category page and the order
confirmation — took raw Prisma rows and called `serializeMoney(product.price)` **themselves**.
That is the money boundary enforced on the wrong side of itself: a `Decimal` cannot cross into
a client component at all, so whatever arrived was no longer a Decimal and serialising it there
was serialising the wreckage.

§4 and ADR 0001 say money crosses the RSC boundary as a string. It does now: the server maps to
a view model and the client component takes `UIProduct[]`, not database rows.

## A83. The home page picked its featured products with `Math.random()` — in a server component

Same file. `selectRandomProductsFromDifferentSubCategories` chose one product per sub-category
at random, on the server, on every render. Two renders of one request could therefore disagree
— a hydration mismatch by construction, and a home page that reshuffles when nothing changed.

It now takes them in the order the SKUs are listed in the file, which is a real editorial
decision that was being thrown away. Same defect class as A74: **anything rendered must be
deterministic**, and `Math.random()` is the loudest possible version of it.

## A84. The i18n middleware broke authentication on the storefront

`/api/auth/get-session` answered **404**. The matcher in `apps/www/proxy.ts` deliberately
includes `/(api|trpc)(.*)` — a line carried over from the Clerk template — so every request to
Better Auth's endpoints fell through to `next-intl`, which redirected them to
`/en/api/auth/get-session`, a route that does not exist.

Every client-side session read failed, so the storefront could not tell a signed-in visitor
from a signed-out one anywhere on the client. API routes now return before localisation. The
matcher stays, because a protected API route would still want the session gate above it.

## A85. There was no way to manage product images at all

Asked directly whether the admin panel can add and edit product photographs, the answer was no.
The P5 workbench had Languages, Inventory, Price, Specs and Settings; the product's photographs
were displayed and nothing more. No upload, no reorder, no deletion, no colour link, no alt
text — for a lighting catalogue, where the photograph *is* the product.

`MediaService` and a Photos tab close it. Decisions worth keeping:

- **Order IS the model.** Position 0 is the listing image and the first of the gallery. A
  separate "main image" flag would be a second answer to one question.
- **Reordering is by explicit move, not drag.** A drag target is invisible to a keyboard, and
  the buttons say what they will do.
- **Uploads mint the same `public_id` shape the migration produced**, so a migrated photo and
  an admin-uploaded one are indistinguishable afterwards — which is what keeps `media:verify`
  meaningful.
- **The row is written only after Cloudinary accepts the file.** A `ProductImage` whose URL
  404s is worse than no image, because the storefront renders the broken one.
- **Deleting a row destroys the asset only if no other row shares its `public_id`.** The
  migration deliberately let several catalog paths share one file.
- **Alt text is paired EN/AR**, like every other translated field.

## A86. A destroyed Cloudinary asset keeps being served without `invalidate`

Found by testing the real upload and destroy path end to end against the live account: upload
200, public read 200, destroy `{"result":"ok"}` — and the URL still answered **200**, from the
CDN edge.

`invalidate: "true"` was passed on upload and not on destroy. Without it a removed photograph
stays visible for as long as the cache lives, which is precisely the window in which someone
checks whether the removal worked. Added.

## A87. `averageCost` was in every product page's payload

Spreading a Prisma row into an RSC response sends every scalar on it, and `Product.averageCost`
is what NewLight PAYS for the product. It reached the browser on the product page and in the
variant strip.

It is `null` today only because no cost has been recorded — and §8.4's bulk cost entry, built
in P5, exists to change that. The first purchase receipt would have shipped the whole
catalogue's cost prices to every customer, with the margin one subtraction away.

`toCardView` drops it and serialises `price` in the same step, applied at the service boundary.
A page that has to remember is a page that will forget.

## A88. The sitemap advertised a 404

`staticPaths` listed `/about-us`; the route is `/about`. Every crawler that read the sitemap was
handed a dead URL, and nothing checked.

Fixed, and `test/sitemap.test.ts` now asserts that every static path has a page file — a
filesystem check rather than 439 HTTP requests, because the failure mode is a path whose page no
longer exists. Reverting the fix makes it fail with `expected [ '/about-us' ] to deeply equal []`,
which is the proof that it tests what it claims.

`/catalog` and `/faqs` are deliberately excluded: both render one word each and are linked from
nowhere. Listing an empty page is worse than not listing it, and the test fails if they are added
back before they have content.

## A89. Fixing authentication exposed a hydration mismatch it had been hiding

Once `/api/auth/get-session` stopped answering 404 (A84), `AuthSection` began throwing
"Hydration failed" on every page: the server has no session and renders the skeleton, and the
client — now able to resolve the session — rendered the account menu during hydration instead.

While the endpoint was broken the session never resolved, both sides rendered the skeleton, and
the mismatch was invisible. It is guarded with `useSyncExternalStore` rather than a mounted flag
set in an effect: it answers "server or client" by construction, with no state write during
render for the React compiler to reject.

Worth recording as a shape: **fixing one defect can reveal another that it was masking**, and a
console that gets louder after a fix is not evidence the fix was wrong.

## A90. Names can be proposed from the data, but not decided by it

A26 left 378 `ProductTranslation.name` values equal to their own SKU. `pnpm names:propose`
generates a name for each product from what the catalogue already knows — the sub-category, the
SKU's variant axis, `maximum_wattage`, `product_dimensions` — and writes them to
`data/name-proposals.json` **without touching the database**:

```
189 proposals · 55 unambiguous · 134 need a person
  12 have a SKU that disagrees with their own recorded wattage
  23 proposed names are shared by more than one product
```

`names:apply` is a separate command and REFUSES any row still carrying `needsReview`. Clearing
that field is the acknowledgement, and it has to be deliberate — generating a name and
committing it to the catalogue are different decisions, and the file in between is where a
person makes the second one.

Two findings fell out of writing it:

- **12 SKUs disagree with their own wattage.** `nl-1051-3w` records `maximum_wattage = 2`. One
  of the two is wrong and the data cannot say which.
- **Colliding names are disambiguated by size, once.** Four 2W uplights in one sub-category all
  proposed "2W Uplight"; appending the dimension separates them only when the dimensions
  actually differ, because appending the same number to all four would produce a longer name
  that still distinguishes nothing. What still collides is reported.

## A91. Four Arabic taxonomy names carry a trailing space

Generated Arabic names came out as `إضاءة Cylinder  ١٥ وات` — a double space — because the
sub-category name itself ends in one. Seven of 27 Arabic taxonomy names also contain Latin
script.

Some of that is correct: `COB`, `LED` and `2×120 Cm` are written in Latin on Arabic datasheets,
exactly like IP ratings. `Linear`, `Cylinder`, `Downlight` and `Wall Washer` are ordinary
English words sitting in an Arabic name. Which is which is a naming decision, so the
data-quality queue reports both and repairs neither. The generator trims, because whitespace is
not a naming decision.

---

# Round 14 — CI, and the orders page

## A92. The gates now run without being remembered

`.github/workflows/verify.yml`, three jobs:

| job | what it proves |
|---|---|
| types and lint | `check-types` (task-count guard + error budget), `check-types:full`, `lint` |
| tests | all 192, each file against its own disposable database from a `postgres:17` service |
| migration chain | replays all 14 migrations into a shadow database and diffs the result against `schema.prisma`, then asserts the four §4.6 CHECK constraints |

Every one was verified locally **with all six `.env` files deleted**, which is the condition CI
actually runs in — the suite, the type check and the chain proof all pass with no environment
at all. `pnpm install --frozen-lockfile` was run too: the lockfile is in sync, and the
`postinstall` regenerates the Prisma client, so CI does not depend on the committed one.

The third job is the one worth having. Nothing else in the repository notices if a migration
stops reproducing the schema, and the constraint check catches what `migrate diff` structurally
cannot see.

## A93. `/orders` was linked from the header and did not exist

`components/auth-section.tsx` linked to `/orders`; only `/orders/[orderId]` existed. A customer
who placed an order could reach it only by keeping the URL. `getUserOrders` had been written,
paginated, and called by nothing.

The page exists now, and so does the thing behind it: **a customer can cancel their own order**.
`requestOrderCancellation` has been complete since P3b — ownership check, then the order state
machine with `actor: CUSTOMER` — and no component ever called it. The button only appears on an
order awaiting shipment, but that is which button to draw; the machine is still what decides,
so a race against a shipment is refused by the same rule that refuses an admin.

## A94. `getOrderHistory` had the §14.4 defect, in the query the new page renders

```ts
translations: { take: 1 }   // no `where: { locale }`
```

An English customer could have been shown Arabic product names, and the reverse. `locale` is now
a required parameter rather than an option — a signature that can be called without one is a
signature that will be — and money is serialised in the same place, since `total`, `subtotal`
and every line price are `Decimal` and this feeds a page that renders them.

Five tests hold both properties: names follow the requested locale and *not* the other one, every
money field is a string, a missing translation falls back to the SKU rather than rendering blank,
and paging reports a total that is not merely the page.

## A95. Rate limiting moved into the database, and migration 0014 exists because of it

The contact form counted requests in a module-level `Map` — per-instance, reset on every cold
start. On serverless each new instance started every caller at zero, on the one unauthenticated
write endpoint the storefront has.

`0014_rate_limits` adds one table and `consume()` makes the whole decision in a single
`INSERT … ON CONFLICT DO UPDATE`, so two instances racing cannot both read 2 and both write 3.
Cleanup rides on the hourly reservation sweep rather than the request path — a limiter that
pays for a cleanup on every call makes the endpoint it protects slower.

The chain is fifteen migrations now. `cutover-preflight.ts` counted to a hard-coded 14; it reads
the directory instead, because a stale constant there would report a correct database as broken,
or a short chain as complete.

## A96. A test that asserted nothing, twice

The A55 timezone property took three attempts to test honestly.

1. `SET TIME ZONE` on the Prisma client, then four calls. **Passed with the defect
   reintroduced** — Prisma pools connections, so the next statement went to a different session.
2. `SET LOCAL TIME ZONE` inside an interactive transaction, pinning one connection. **Also
   passed with the defect**, because reverting the fix changed the INSERT *and* the comparison
   together: both sides wrong in the same direction is a system that agrees with itself.
3. Create the row **through Prisma** — which writes UTC — then consume it under
   `Africa/Cairo`. That is the real asymmetry, and it fails with the defect
   (`expected 1 to be 4`: the counter reset because a 30-second-old window looked three hours
   expired) and passes with the fix.

Every claim of the form "this test proves X" is worth the thirty seconds it takes to reintroduce
X and watch it fail. Two of these three would have been shipped as proof of something they did
not check.

## A97. The constraint test caught my own migration, and was made stricter rather than looser

`0014` added a fifth CHECK constraint and `has all four §4.6 check constraints` failed
immediately — which is the test working. A CHECK constraint appearing without anyone noticing is
precisely what it exists to catch.

It names the new one now. The alternative, relaxing it to a count, would have made it pass for
any five constraints including four wrong ones.

## A98. Every mistyped URL showed Next's default 404

The storefront has a designed `not-found.tsx` — animated, translated — and it only ever fired
for an explicit `notFound()` inside a matched route. A URL matching no route never reaches the
`[locale]` segment, so it fell through to the framework's own page: unstyled, English, on an
Arabic site.

`app/not-found.tsx` handles it, and cannot use next-intl either — there is no locale to read,
which is the whole reason it is rendering. So it says it in both languages and lets the visitor
choose, rather than guessing and being wrong half the time.

## A99. The panel could change a catalogue and not define one

An audit of every model against the admin's write surface. The panel had no `product.create` at
all: 189 products were editable and the 190th could only arrive through a migration.

`/admin/products/new` closes it, and four decisions in it are worth keeping — both languages
required at creation, opening stock written as an `INITIAL` ledger movement rather than a level,
the product created **hidden** because it has no photograph yet, and a duplicate SKU belonging
to an archived product answered with "restore that one" instead of a constraint violation.

What is still read-only is written down in [erp-gaps.md](erp-gaps.md), ranked: taxonomy,
specification definitions, administrators and roles, an audit-log reader, tracking-number entry,
families, colours, locations. The pattern in all eight is the same as the one this closed —
reference data seeded by a migration, with no way to change it afterwards.

## A100. Taxonomy management, and the rules the panel could not previously enforce

`/admin/taxonomy` — the tree, create and edit for both levels, archive and restore. Adding a
category no longer means writing a migration.

Three things it enforces that could not be enforced before, because there was no code path to
enforce them in:

- **Both languages, always.** A category IS its two translation rows (§10) — there is no base
  name — so one created in English only renders as a gap on the Arabic storefront. The service
  refuses it and the form marks it before you submit.
- **A rename writes its redirect in the same transaction.** `TaxonomySlugHistory` is what makes
  an old URL a 301 instead of a 404, and a rename that forgets it breaks every inbound link the
  moment it succeeds.
- **A slug that still redirects somewhere else cannot be reused.** Live rows and history are
  checked together; reusing a retired slug would make the redirect ambiguous.

Archiving refuses while anything lives inside, and names the count — a sub-category holding
products is a shelf with things on it, not a mistake to clean up.

Nine tests, including the two that matter most: renaming retires both slugs into history, and
renaming *without* changing the slug leaves history untouched.

## A101. The admin panel had no Toaster, so every message it wrote went nowhere

Found by clicking Archive on a sub-category holding 13 products. The service refused correctly
and named the count. The person clicking saw **nothing at all**.

`components/ui/sonner.tsx` existed and was never rendered. So every `toast.success` and
`toast.error` in the admin — the price editor, the spec editor, image upload and deletion, stock
adjustments, translation saves, the shipping rates, and every refusal message written
specifically to explain *why* something was refused — had been silent for the whole of P5.

Two things worth taking from it:

- **I built the entire feedback layer on toasts and never once confirmed a toast appeared.**
  Watching a page update after an action is not the same as watching the action report itself;
  the earlier price-change verification passed on the first and I read it as the second.
- **The first attempt to confirm the fix also failed**, because sonner dismisses after four
  seconds and the check waited five. Polling every 200ms captured it. A verification that waits
  longer than the thing it is verifying will report the same "nothing" as a real failure.

## A102. The specification dictionary is editable, and deleting from it is refused

`SpecDefinition` was seeded by migration `0006` and read-only ever since, so a new kind of
fixture with a measurement nobody had thought of could not be described without a migration.
`/admin/specs` manages the dictionary; the sub-category page manages which specs it asks for.

The dangerous half is deletion, and it is dangerous in a way the database will not warn about:

```prisma
ProductSpec.spec → SpecDefinition  onDelete: Cascade
```

Removing a definition takes every product's value for it, silently. So deletion counts first
and refuses with the number — and the UI does not draw the button at all while anything uses
it. Prevention rather than an undo, because there is nothing to undo with.

Three more decisions:

- **The key cannot be edited.** It is the primary key, it is what `ProductSpec` rows point at,
  and it is written into the storefront's filters and the transform's dictionary. Renaming it
  is a migration, not an edit, so it is not offered.
- **The type can change only when the data agrees.** Switching TEXT to NUMBER is refused while
  non-numeric values exist, and the message says how many — `"12-15"` and `"220-240"` are real
  datasheet answers, not errors to coerce away.
- **Unassigning a spec from a sub-category keeps every value products already have.**
  `ProductSpec` is a different table with no dependency on `SubCategorySpec`; the values remain
  and the product editor marks them "not declared here". Unasking a question is not the same as
  destroying the answers that were already given.

Eleven tests, including the two refusals and the one that proves the values survive
unassignment.

## A103. Administrators can be added and removed, and SUPER_ADMIN finally means something

`/admin/team`. Until now the only way to add an administrator was `seed-super-admin.ts` with a
database URL — despite that script's own comment saying the next one is created "through the
panel" — and there was no way at all to remove someone who left.

It is also the first time the two roles differ. `requireSuperAdmin` existed and nothing called
it: every administrator could do everything, and the distinction lived in the schema alone.
Managing administrators is SUPER_ADMIN-only, through a new `requireCurrentSuperAdmin()`.

**The two guards matter more than the features**, and neither can be found by using the panel —
you would have to lock yourself out to discover them:

- **You cannot change your own role.** Demoting yourself is a locked door with the key inside.
- **The last SUPER_ADMIN cannot be demoted.** The only recovery is the seed script and a
  database URL, which is exactly the situation this page exists to end.

Both are enforced in the service and shown in the table as sentences rather than disabled
buttons, so the reason is visible before the click instead of after it.

Three smaller decisions:

- **Demotion revokes every session; promotion does not.** Whether Better Auth would notice a
  role change on its own depends on how it caches a session, and "probably" is not good enough
  for someone who has just been removed. Being given *more* access should not sign you out of
  what you were already doing.
- **The password is shown once and stored nowhere** — the account holds a hash, and the audit
  log deliberately records the email and role and not the credential. An audit log containing
  passwords is a credential store nobody meant to build; a test asserts it does not.
- **It should be an emailed invitation and cannot be yet.** `RESEND_API_KEY` is unset, so an
  invitation would sit in the outbox while the new administrator waited for something that was
  not coming. The screen says so, and says what it becomes once the domain is verified.

Nine tests. The live path was not exercised in the browser on purpose: doing so would leave a
real administrator account with a real password in the owner's system.

## A104. The audit log has a reader

`/admin/audit`. Every price change, translation save, spec edit, image upload, archive, role
change and order transition has been recorded with an actor and a timestamp since P5, and the
only way to see any of it was a database client. The one place it surfaced was a single
product's price history, reading its own narrow slice.

Three decisions:

- **The filters are built from the data.** Actions are formed by template in places —
  `order.shipped->delivered`, `${kind}.restore` — so a hard-coded list would be wrong the first
  time someone adds a transition. Every option is a value that exists, with its count.
- **The diff renderer recognises SHAPES, not action names.** `{from,to}`, `{field:[from,to]}`
  and `{changes:[…]}` cover everything written today, and anything unfamiliar falls back to the
  raw JSON rather than a friendly summary — a summary that guesses wrong about an unknown shape
  is worse than the data, because the data is the point.
- **Ordering breaks ties on `id`.** Two rows written inside one transaction share a timestamp
  to the millisecond, and an unordered tie makes "the first fifty" a different fifty each time
  (A74, again).

Verified against this session's own history: the two image reorders, the two spec saves and the
two price changes, with `nl-p-12w: 750.00 → 693.00` — the revert — rendering correctly.

## A105. The status dropdown offered illegal transitions, silently

Item 5 was "there is nowhere to type a tracking number". Opening the component found two larger
problems sharing the same six lines.

**It offered every status.** `Object.values(OrderStatus)` put "Delivered" in front of an order
that had not shipped, and "Awaiting Shipment" in front of one already delivered. The state
machine refused them correctly — so the menu presented four choices of which up to three were
errors.

**And the refusal was invisible.** `useMutation` had no `onError`, `changeOrderStatus` returns a
refusal as *data* rather than throwing, and until A101 the app had no Toaster. Choosing an
illegal status did nothing whatsoever: nothing moved and nothing said why.

The menu is now built from `allowedTransitionsFrom(status, "ADMIN")` — the same table the
machine enforces, so the two cannot drift — and a terminal status says "Nothing follows this"
rather than showing an empty menu. Refusals surface as errors.

## A106. Tracking numbers can be entered, in both the places they are actually known

`shipOrder(id, actor, trackingNumber?)` accepted one, `changeOrderStatus` passed one through,
and no caller ever supplied it — which is why `/admin/shipping` counted "shipped, untracked".

Marking an order shipped now asks for it **and lets you skip**: under COD the number usually
arrives after the parcel does (F3), and refusing to ship without one would only teach people to
type a placeholder. `setTrackingNumber` records or corrects it afterwards, audited, and the
input sits on the shipping page — in the row where its absence is reported, rather than three
clicks away.

Exercised end to end against a real order: shipped with `BOSTA-99881122` (one ledger movement,
`paymentSettled: false` — payment settles on delivery, F4), cleared, then re-entered. The audit
trail reads:

```
order.awaiting_shipment->shipped   trackingNumber: BOSTA-99881122
order.tracking_number              BOSTA-99881122 → null
order.tracking_number              null → BOSTA-RE-ENTERED-42
```

The test order was removed afterwards and the stock level put back to 5000, so the ledger and
the derived level still agree.

## A107. Families, colours and locations — three deletes, three different dangers

The last of the reference data, on one page because they share a shape: small, rarely changed,
and referenced by everything. What differs is what happens when one is removed, and the design
follows that entirely:

| | relation | on delete | so the service… |
|---|---|---|---|
| Family | `Product.familyId` | SET NULL | **scatters** — products survive as standalone, and the count is reported |
| Colour | `ProductAvailableColor` | CASCADE | **refuses** while any product offers it, and points at deactivating |
| Location | `StockMovement.locationId` | RESTRICT | **refuses** — and the database refuses after it |

Only the third protects itself. The first two would happen silently, which is the whole reason
each has a different answer rather than one shared "are you sure".

Three more decisions:

- **A colour's KEY cannot be edited.** `CartItem.selectedColorKey` and
  `OrderItem.selectedColorKey` store it as a snapshot, deliberately without a foreign key, so
  the colour a customer chose survives the colour changing. Renaming the key would orphan every
  past choice.
- **A product cannot join a family from another sub-category.** A family belongs to one, so the
  product would appear under a heading it does not live beneath.
- **Exactly one default location, always.** `DEFAULT_LOCATION_ID` is what every adjustment,
  receipt and sale uses when none is given — which is all of them today — so two defaults would
  make that ambiguous and none would make it fail. The switch is one transaction.

## A108. A product's colours were readable and editable nowhere

Found while building the colour list: `ProductAvailableColor` drives the swatches a customer
picks from, the product header displayed them, and nothing could change them. A fixture that
started coming in brass stayed black-only until someone wrote SQL — and the data-quality queue
has been reporting **16 products with no colour at all** with nowhere to answer it.

The picker sits above the photographs, because a photograph can be linked to a colour and
linking one to a colour the product is not offered in is a question with no answer.

Verified in the browser: WOOD is the only colour offering a Delete button, because it is used by
0 products and 0 photos — which is exactly what the transform reported in P1 ("WOOD exists in
the lookup and is used by none") and the first time that finding has been actionable.
