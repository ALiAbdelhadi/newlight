# P2 — transactional email, Better Auth, Clerk removal

Complete. §26 scopes P2 as *`packages/mail` → Better Auth → Clerk removal*; all three landed
and are verified against the branch rather than merely compiled.

Decisions are recorded in [ADR 0004](adr/0004-auth-seam.md) and
[ADR 0008](adr/0008-transactional-outbox.md).

---

## 1. The exit criterion

```
$ grep -rn "@clerk" apps packages | grep -v node_modules
$ echo $?
1
```

Nothing. Down from **44 references across 37 files**. `CLERK_*`, `ADMIN_EMAIL`, `ADMIN_NAME`
and `ADMIN_PASSWORD` are gone from all six `.env` files, and both CSPs have lost their Clerk
origins in `script-src`, `connect-src`, `frame-src` and `img-src`.

## 2. What landed

| | |
|---|---|
| `packages/mail` | `sendMail` · Resend HTTP transport · console fallback · 6 bilingual templates · `outbox.ts` |
| Migrations | `0012_email_outbox`, `0013_better_auth` |
| Auth seams | `apps/www/lib/auth.ts`, `apps/admin/lib/auth.ts` — the only files importing `better-auth` |
| Client seams | `lib/auth-client.ts` in each app |
| Auth UI | sign-in, sign-up, forgot-password, reset-password (storefront, bilingual); sign-in (admin, English) |
| Cron | `apps/www/app/api/cron/mail-outbox` + `vercel.json`, every 2 minutes |
| Bootstrap | `pnpm --filter @repo/database seed:super-admin` |
| Gates | `lint` 0 errors in 4 packages · `check-types` at budget · `db:verify-chain` green |

## 3. Evidence

**The whole surface, exercised against the branch** — not asserted, run:

```
── Outbox ──────────────────────────────────────────────────────────
  ok   queued inside a transaction                          cmtpo7i340000laklgc1rq2sj
  ok   re-queueing the same dedupeKey is idempotent
  ok   row is PENDING before dispatch                       1 row(s)
  ok   dispatch claimed and sent                            {"claimed":1,"sent":1,…}
  ok   row is SENT with a sentAt                            SENT attempts=1
  ok   a second sweep re-sends nothing                      {"claimed":0,…}

── Auth ────────────────────────────────────────────────────────────
  ok   sign-up accepted                                     HTTP 200
  ok   user row written to OUR database
  ok   new users default to CUSTOMER, not ADMIN             CUSTOMER
  ok   email starts unverified
  ok   password stored as a hash, never plaintext
  ok   sign-in refused before verification                  HTTP 403
  ok   sign-in accepted after verification                  HTTP 200
  ok   wrong password refused                               HTTP 401
  ok   session row created
```

All 12 template renders (6 templates × 2 locales) produce a subject, an HTML body with a real
`<table>` layout, and a plain-text part. Arabic renders `dir="rtl"` with Tahoma and
right-aligned content — checked in a browser, not inferred from the markup.

The verification email in that run went out **in Arabic**, because the account's
`preferredLanguage` was `ar`. That is the locale plumbing working end to end: the language
comes from the user's record, not from whichever request triggered the send.

## 4. The bug the type checker could not see

Rendering a template under plain `tsx` threw:

```
ReferenceError: React is not defined
    at renderTemplate (packages/mail/templates/index.tsx:46)
```

`packages/mail` is transpiled by two different toolchains — Next's SWC uses the automatic JSX
runtime, `tsx` in the cron sweep and in scripts emits `React.createElement`. Under the second,
JSX with no `React` in scope throws at runtime. `tsc --noEmit` was clean throughout.

Found by running the outbox, not by compiling it. Fixed with an explicit `import * as React`
in the three `.tsx` files, with the reason written above the import so nobody deletes it as
redundant.

The outbox handled it correctly on the way: a template that cannot render will never render,
so it was classified permanent and the row went straight to `FAILED` rather than retrying six
times.

## 5. Defects found and repaired

**Authorization was nine string comparisons.** `user.emailAddresses[0].emailAddress !==
process.env.ADMIN_EMAIL`, in nine files, with no role anywhere in the schema. Forgetting one
was an unguarded route and nothing could tell you by reading. All nine now call
`requireCurrentAdmin()`, which throws on both "not signed in" and "signed in but not an
admin", so a forgotten check fails closed.

**`OrderQueue` had zero callers.** It was not a stub waiting to be filled in — nothing called
it, so an order genuinely sent nothing. Deleted, and the confirmation is now queued inside the
order-creation transaction with `dedupeKey: order-confirmation:<orderId>`.

**The admin notification only ever reached one address.** `createAdminNotifications` looked up
a single user by `process.env.ADMIN_EMAIL` and returned silently when no row matched — so a
second administrator, or a changed address, meant notifications that went nowhere. It now
selects every user whose role is `ADMIN` or `SUPER_ADMIN`.

**`syncUserWithDatabase` is deleted** — one of the lazy-create sites §7 names. Better Auth
writes the user row itself, in this database, at registration.

**Middleware ordering was backwards.** Clerk wrapped `intlMiddleware`, so every request paid
for an auth check before it was localised. Now intl runs for everything and the session cookie
is consulted only for protected paths — and only as an optimistic gate. `getSessionCookie`
does not touch the database; the real authorization is `getIdentity()` / `requireAdmin()` in
the page or action. A forged cookie gets past the middleware and fails there.

## 6. The one production user

Its email was `NULL`, and Better Auth requires `NOT NULL UNIQUE`. It was **not deleted**:
`orders.userId` cascades, so deleting it would have destroyed the 4 production orders and
broken the §18.3 reconciliation invariant.

Instead `0013` backfills `migrated-<id>@newlight.invalid` — the `.invalid` TLD is reserved by
RFC 2606 and can never resolve, so the address cannot be accidentally emailed or collide with
a real one. The row gets no `accounts` row, so it cannot sign in. That is correct: §7 is
explicit that there is no claim-account flow.

## 7. Owner tasks

| | |
|---|---|
| **Resend domain verification** — SPF, DKIM and DMARC on a mail subdomain, then `RESEND_API_KEY` and `EMAIL_FROM`. Until then mail is logged, not delivered, and says so. | blocks delivery, not the build |
| **`EMAIL_REPLY_TO`** — where contact-form notifications go | admin notifications |
| **Rotate the seeded SUPER_ADMIN password** — it was printed to the terminal during setup, so it is in this session's transcript | do this first |
| **Cloudinary credentials** — still outstanding from P1 | 347 files, 232.8 MB, ready |
| **Neon PITR retention** — still outstanding | §20 condition 5, P6 |

## 8. Environment

Added: `BETTER_AUTH_SECRET` (a distinct value per app — a leaked storefront secret must not
forge an admin session), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `MAIL_OUTBOX_CRON_SECRET`.

Removed: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `ADMIN_EMAIL`, `ADMIN_NAME`,
`ADMIN_PASSWORD`.

## 9. The budget moved backwards again, and why

`www 111 → 112`, `admin 108 → 110`; `@repo/mail` joins at 0. Both apps now read identity from
their own database instead of a provider, which surfaces v1-column references those files
already carried — `product.inventory`, `product.images`, `OrderItem.selectedColor`,
`ProductConfiguration.discount`. Checked file by file: **no file P2 authored or rewrote has a
single error**, and every new one is a P3 or P5 adaptation site. Recorded in
`scripts/verification-budget.json`'s `history`.

## 10. What P3 starts from

- Storefront adaptation, the revalidation endpoint, Sentry, analytics — and the `search.ts`
  result shape P1 changed (`price` is a string, `images` is an array of objects) is waiting
  for its call sites.
- `apps/www/lib/services/order-service.ts` already queues its confirmation correctly; P3b only
  has to replace the `product.inventory` decrement with `recordMovement()`.
- The auth seam is one file per app. Adding a role, changing a session length, or swapping the
  provider is a change there and nowhere else.
