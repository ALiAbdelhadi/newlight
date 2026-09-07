# What is missing before this is an ERP

Checked table by table against the Prisma schema: for each model, can an administrator create,
read, update and delete it from the panel? Every line below has a command behind it.

The panel is excellent at **changing** a catalogue and poor at **defining** one. Everything P5
built operates on a row that already exists.

---

## Closed

### Creating a product — the largest one

There was no `product.create` anywhere in `apps/admin`. All 189 products were editable and the
190th could only arrive through a migration or by hand in psql.

`/admin/products/new` exists now. Four decisions worth keeping:

- **Both languages are required.** A product created in English only renders as a gap on the
  Arabic storefront, and the translation queue would report it the next day. Refusing at
  creation is cheaper than reporting it forever.
- **Opening stock goes through the ledger** — an `INITIAL` movement through `recordMovement`,
  the same path the migration used, never a write to `stock_levels`. A product whose first
  stock has no movement behind it is a hole in the audit trail on day one.
- **It is created hidden.** It has no photograph, and on a lighting storefront a product with
  no photograph is worse than one that is not there. The form sends you straight to Photos.
- **A duplicate SKU that belongs to an archived product says so**, rather than refusing with a
  unique-constraint error, because the answer is to restore that one.

Seven tests, and it was exercised in the browser end to end: `nl-demo-15w` created, redirected
to Photos, 40 on hand from the ledger, badge reading **Hidden**. Removed afterwards — and
`hardDelete` refused it first, because it had a stock movement, which is the guard working.

---

## All eight are closed

The list below is kept as written, with each item's outcome, so the fix can be read against
what it fixed.

### ~~1. Categories and sub-categories~~ — CLOSED

`/admin/taxonomy`: the tree, create and edit for both levels in both languages, archive and
restore. A rename retires the old slug to a redirect in the same transaction; a slug that still
redirects elsewhere cannot be reused; archiving refuses while anything lives inside and names
the count. Nine tests (A100).

It also surfaced A101 — the admin panel had no `<Toaster />` mounted, so every message it wrote,
including every refusal, had been silent since P5.

### ~~2. Specification definitions~~ — CLOSED

`/admin/specs` manages the dictionary; the sub-category page manages which specs it asks for.
Deleting a definition is refused while anything uses it, because `ProductSpec` cascades from it
and would take every product's value silently. The key cannot be edited (it is a migration, not
an edit) and the type cannot change while the data disagrees. Eleven tests (A102).

### ~~3. Administrators~~ — CLOSED

`/admin/team`: add, promote, demote, remove access, sign out of every device. SUPER_ADMIN only,
through a new `requireCurrentSuperAdmin()` — which is also the first time the two roles differ,
since `requireSuperAdmin` existed and nothing called it.

Two guards carry it: you cannot change your own role, and the last SUPER_ADMIN cannot be
demoted. Demotion revokes sessions; promotion does not. The generated password is shown once
and stored nowhere, including the audit log. Nine tests (A103).

### ~~4. The audit log has no reader~~ — CLOSED

`/admin/audit`: filter by action, entity or person, search, paginate, and follow the entity id
to the thing it changed. Filters are built from the data; the diff renderer recognises shapes
rather than action names and falls back to raw JSON. Verified against this session's own
history (A104).

### ~~5. Tracking numbers cannot be entered~~ — CLOSED

Asked for when marking an order shipped (skippable — under COD the number arrives later), and
editable afterwards from the shipping page, in the row that reports its absence. Opening the
component also found that the status menu offered every status including illegal ones, and that
the refusal was silent; it is now built from the state machine's own transition table (A105,
A106).

### ~~6. Product families~~ — CLOSED

`/admin/reference` → Families. Create, rename, set what it varies by, archive. Archiving
scatters rather than deletes (SET NULL) and reports how many products become standalone. Moving
a product between families lives on the product itself, and is refused across sub-categories
(A107).

### ~~7. Colours~~ — CLOSED

`/admin/reference` → Colours, and a picker on each product for which colours it is offered in —
that second half was missing too, with 16 products carrying no colour and nowhere to fix it.
Deleting is refused while any product offers it, because `ProductAvailableColor` cascades; the
key cannot be edited because past orders snapshot it (A107, A108).

### ~~8. Locations~~ — CLOSED

`/admin/reference` → Locations. Add, rename, change which is the default, delete one that never
held anything. A location with movements is refused by the service and then by the database
itself — those movements are the record of stock that physically moved (A107).

---

## Not gaps

- **Orders can be moved through their states** from three screens, through the state machine.
  I nearly reported this as missing and checked.
- **Products, images, specs, translations, prices, stock and archiving** are all fully editable.
- **Shipping rates** are editable, and audited.
