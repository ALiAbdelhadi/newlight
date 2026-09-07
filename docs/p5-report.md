# P5 — the admin panel

**Five routes that did not exist, four defects that did, and 178 tests still green.** Decisions
in [schema-v2-amendments.md](schema-v2-amendments.md) A59–A65.

```
[budget] @repo/database      0 errors /    0 allowed
[budget] www                 0 errors /    0 allowed
[budget] admin               0 errors /    0 allowed
[budget] @repo/mail          0 errors /    0 allowed
pnpm lint          0 errors, 36 warnings
pnpm test          178 passed (14 files, 4 packages)
pnpm --filter admin build   ✓ 24 routes
```

---

## 1. What §13.2 asked for, and what it got

| # | Contract | Status |
|---|---|---|
| 1 | Bulk price editor with preview | `/admin/products/pricing` — preview → token → apply |
| 2 | Bulk cost entry (§8.4) | `/admin/inventory` — one ledger receipt per row |
| 3 | Inventory never an editable number | Workbench: correction / damage / goods in, each with a reason |
| 4 | Money snapshots immutable | `assertSnapshotsIntact()` + an end-to-end test (A61) |
| 5 | Every mutation revalidates the storefront | Every service method calls `revalidateStorefront` |
| 6 | Soft delete by default | `CatalogService`; hard delete refuses with named blockers (A64) |
| 7 | Paired EN/AR translation editing | Workbench Languages tab + `/admin/translations` queue |
| 8 | Fix the known defects | Below |

## 2. The named defects

| Defect | Before | Now |
|---|---|---|
| `isActive: true` hid inactive products | The one screen that reactivates them could not see them | Only `deletedAt` filters |
| Unscoped `take: 1` translations | Postgres returned whichever row it liked | `where: { locale: "en" }` |
| No pagination | Every product, every render | 50/page, and the controls are **rendered** — they were computed and never drawn |
| Dead Edit/View handlers | A menu item with no handler | Deep-links to `?tab=translations` and `?tab=inventory` |
| Missing `/admin/products/[id]` | Every "View Product" was a 404 | Built |
| Sidebar → `/admin/shipping` | 404 | Built |
| Sidebar → `/admin/customers` | — | **Never existed as a link.** `/admin/users` is that screen (A59) |

## 3. The finding behind the Shipping screen

The dead link was the smaller half. The three delivery prices were an object literal inside the
storefront's `createOrder`, so the only way to change what a customer pays for delivery was a
code change and a deploy — and a Shipping screen could not have edited them.

They are `SystemSetting` rows now, read by both apps through `packages/database/shipping.ts`,
defaulting to the same 50 / 100 / 200 (A60). The screen also shows the fulfilment queue oldest
first, and counts parcels shipped under COD with no tracking number entered — normal, since
tracking is manual under F3, and still the list of parcels nobody can answer a question about.

## 4. Two properties that are now asserted rather than intended

**Money snapshots.** An order is placed at 150.00, the product is repriced to 300.00 through
the real bulk editor, and the order line still reads 150.00. `assertSnapshotsIntact()` reports
any order whose subtotal disagrees with its own lines; the test asserts it returns `[]`.

**No silent translation fallback.** Deleting a product's Arabic row and reading it back returns
`ar.name === null` and `ar.exists === false` while the English description sits right there
untouched. A name equal to its own SKU counts as untranslated (A62), which is why the queue
opens showing most of the catalog — that is the true state.

## 5. Tests

24 admin tests (11 pricing, 13 catalog/translation), inside the same disposable-database
harness as the rest:

```
@repo/database   79 passed (7 files)
@repo/mail       29 passed (2 files)
www              46 passed (3 files)
admin            24 passed (2 files)
```

## 6. Design

Phase plan and Design Brief in the scratchpad. Phase 2 deliberately **did not run**: the repo's
own shadcn/Tailwind-4 system outranks any new aesthetic direction, and adding one to five
screens of a fourteen-screen tool is how a tool ends up looking like two tools. The
`ui-ux-pro-max` database supplied the table-overflow, confirmation-dialog and submit-feedback
rules; its `rtl arabic bidirectional` query returned **0 results**, so that fallback is
deliberate and recorded rather than hidden.

One script-coverage note, because it fails silently otherwise: Geist has no Arabic. The `ar`
inputs carry `dir="rtl"` and inherit the system Arabic stack.

## 7. Still open

Unchanged from P3b, all owner-blocked:

- **Cloudinary credentials** — image migration cannot run
- **Resend domain verification** — mail is queued and logged, not delivered
- **Neon PITR retention** — §20 condition 5
- **Rotate the seeded SUPER_ADMIN password** — it was printed to a terminal

And one verification gap: the **visual pass on the five new screens has not been done**. The
admin app is private by design (`proxy.ts` redirects every route), and signing in requires
entering a password, which I do not do. The production build proves all five routes compile and
resolve; it does not prove they look right. That check needs a session.
