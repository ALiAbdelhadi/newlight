# What is missing — a full-project audit

> **Status, after the follow-up work:** §1, §2, §5, §6, §7 and §10 are closed. §3 and §8 need
> content or a credential only the owner has. §4, §11 and §12 are unchanged. The detail below
> is the original finding in each case, kept so the fix can be read against what it fixed.

Checked against the repository as it stands, not from memory. Every claim below has a command
behind it. Things I expected to find missing and did **not** are listed at the end, because a
list of only problems is not an audit.

---

## 1. A customer cannot see their own orders

**CLOSED.** `/orders` exists, paginated, in both locales, and a customer can cancel an order awaiting shipment through the same state machine the admin uses. Five tests hold the locale scoping and money serialisation (A93, A94).

The header links to `/orders`. The route does not exist — only `/orders/[orderId]` does.

```
apps/www/components/auth-section.tsx:161   <Link href={`/${locale}/orders`}>
apps/www/app/[locale]/(main)/(pages)/orders/   → only [orderId]/
```

`getUserOrders(page, limit)` is written, paginated, and called by nothing. So a customer who
places an order can reach it only by keeping the URL. This is the same defect class as the
admin's dead `/admin/shipping` link, on the customer side.

**And they cannot cancel one.** `canCancelOrder`, `requestOrderCancellation` and `cancelOrder`
all exist as server actions; no component in the storefront calls any of them. The admin can
cancel an order and the customer cannot ask.

## 2. Two public pages are one-word stubs

**CLOSED.** `/catalog` answers **308** to `/category` — done in `next.config.ts`, because a page-level `redirect()` rendered the destination without changing the URL, which is the duplicate content a redirect exists to avoid. `/faqs` is deleted: there was nothing equivalent to send anyone to, and writing an FAQ on the owner's behalf would be worse than a 404.

```tsx
// apps/www/.../catalog/page.tsx
export default function page() { return (<div>Catalog</div>) }
// apps/www/.../faqs/page.tsx
export default function page() { return (<div>FAQs</div>) }
```

Both return 200 to anyone who finds them. They are linked from nowhere and excluded from the
sitemap (A88), so the exposure is small — but they are live pages that ship nothing.

## 3. No terms of service and no returns policy

**OPEN — needs you.** Still nothing drafted. I have not written it: a returns policy is what a customer is held to at checkout, and inventing one on your behalf would put words in your mouth that bind you.

The footer links to About, Contact and Privacy. There is no terms page, no returns or refund
policy, and no message keys for either in `messages/*.json`.

For a store taking cash-on-delivery orders in Egypt, the returns policy is not decoration —
it is the thing a customer is agreed to at checkout, and consumer-protection rules assume it
exists. This is content only the owner can write; the gap is that nothing is drafted at all.

## 4. The catalogue still has no product names

**PARTLY.** 189 proposals generated, 55 unambiguous, 134 awaiting a decision. Nothing applied.

All 378 `ProductTranslation.name` values are the SKU (A26). `pnpm names:propose` now generates
189 proposals, of which **55 are unambiguous and 134 need a decision**. Nothing is applied.

Alongside it, in the admin's data-quality queue:

| | |
|---|---|
| 228 | specifications whose value is the placeholder `"-"` |
| 16 | products with no colour recorded |
| 12 | SKUs that disagree with their own `maximum_wattage` |
| 7 | Arabic taxonomy names containing Latin script; 4 with a trailing space |
| 4 | specs stored as booleans where text or a number belongs (N4) |

All carried across from v1 verbatim and reported rather than repaired, by design.

## 5. There is no CI

**CLOSED.** `.github/workflows/verify.yml` — types and the error budget, all 197 tests against a real Postgres, and the migration chain replayed into a shadow database and diffed against `schema.prisma`. Every job verified locally with all six `.env` files deleted, which is the condition CI runs in (A92).

No `.github/`, no pipeline of any kind. `pnpm check-types`, `pnpm lint` and `pnpm test` run
when someone remembers to run them. Every gate this project built — the ratcheting error
budget, the task-count guard, the 187 tests, the sitemap guard — is enforced by habit.

This is the cheapest missing thing on the list and the one that protects all the others.

## 6. No error boundaries

**CLOSED.** `error.tsx` and `global-error.tsx` in both apps, plus a root `not-found.tsx` — because any mistyped URL was rendering Next's unbranded English default, not the designed 404. Proven against a production build: a page made to throw returned the Arabic error page with a reference code, not a stack trace.

```
apps/www/app   → [locale]/loading.tsx, [locale]/not-found.tsx
apps/admin/app → none at all
```

Neither app has an `error.tsx` or `global-error.tsx`. A thrown exception anywhere in the admin,
or on a storefront page, renders Next's default error page — in production, a bare "something
went wrong" with no branding, no way back, and no report.

## 7. Rate limiting resets itself

**CLOSED.** Migration `0014` adds a `rate_limits` table and `consume()` decides in one `ON CONFLICT` statement, so two instances racing cannot both allow the same request. Six tests, including one that reproduces the A55 timezone asymmetry — and that test caught the defect only on its **third** version; the first two flipped both sides of the comparison at once and passed with the bug reintroduced.

`apps/www/app/[locale]/api/contact/route.ts` keeps its counters in a module-level `Map`:

```ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
```

That is per-instance and per-cold-start. On serverless it is close to no rate limit at all —
each new instance starts every caller at zero. The contact form is the one unauthenticated
write endpoint the storefront exposes.

## 8. Nothing reports errors from production

**PARTLY — needs a DSN.** Every boundary now calls one `reportError()` seam, which writes a structured record with the error's `digest` and is the single function a real reporter replaces. No fake Sentry.

Sentry was deferred in P3 for want of a DSN and never revisited. When something fails for a
customer, the only trace is whatever `pino` wrote to a log nobody is watching. Combined with
§6, a broken page is invisible until someone complains.

## 9. Mail is written and never sent

`RESEND_API_KEY` is unset in all three `.env.local` files (the transport moved back to Resend's
HTTP API on 2026-09-10; SMTP and Nodemailer are gone), so every message goes to the outbox
and the log instead of to a customer. The outbox, the retry schedule and the cron are all
built and working; the credential — and the Resend domain verification behind it — is missing.
Owner-blocked.

## 10. The READMEs describe a different project

**CLOSED.** All three rewritten to describe this repository.

`README.md` at the root is still the **Turborepo starter boilerplate** — it documents `docs`
and `web` apps that do not exist here. `apps/www/README.md` and `apps/admin/README.md` are
untouched `create-next-app` output. Only `packages/database/README.md` is real.

Anyone new opens the repository to instructions for a project this is not.

## 11. 199 files are uncommitted

Everything from P1 to now — the migration chain, the mail package, Better Auth, the inventory
ledger, the admin panel, the cutover tooling — is uncommitted on `main`. The last commit is
`980e47b`. One bad `git checkout` loses all of it.

## 12. Still owner-blocked

1. **Neon PITR retention** — must be read from the console; §20 condition 5
2. **Resend sending domain** — §9 above
3. **Rotate the seeded SUPER_ADMIN password** — it was printed to a terminal
4. **The cutover itself** — production has never been written to

---

## What I expected to be missing and is not

- **The cron jobs are scheduled.** `apps/www/vercel.json` runs the mail outbox every 2 minutes
  and the reservation sweep hourly. I said otherwise mid-audit and was wrong.
- **Translations are at exact parity** — 717 keys in `en.json`, 717 in `ar.json`, no drift
  either way.
- **Every admin sidebar link resolves.** All eight.
- **Security headers are set** in both apps — CSP, X-Frame-Options, HSTS.
- **The sitemap is correct and guarded** by a test that fails if the fix is reverted.
- **No TODOs left in the code.** One comment mentions a TODO that was removed.
