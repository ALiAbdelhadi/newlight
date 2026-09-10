# ADR 0008 — Transactional email goes through an outbox

Status: accepted, implemented in P2 · 2026-09-06

## Context

Customers received nothing when they ordered. `apps/www/lib/queues/order-queue.ts` was a class
called `OrderQueue` containing three `console.log` calls, and **it had zero callers** — so the
gap was not "the queue is a stub", it was "nothing was even wired to the stub".

Better Auth also cannot verify an address or reset a password without a way to send mail,
which is why §6 makes this a blocking dependency of §7 rather than parallel work.

## Decision

- **One entry point.** `packages/mail` exports `sendMail`, and no app imports Resend or React
  Email. Transport is a runtime choice behind the `MailTransport` interface — Resend's HTTP API
  when `RESEND_API_KEY` and `EMAIL_FROM` are both set, console otherwise.
- **HTTP, not SMTP**, because Vercel's functions cannot hold a persistent SMTP connection
  reliably. No SDK: the Resend API is one POST, and a dependency to make it would hide the
  only part worth reading.
- **`sendMail` never throws.** §16 requires that a failed email cannot fail an order, and the
  honest way to guarantee that is for failure to be a return value rather than an exception a
  caller might forget to catch.
- **A transactional outbox.** `queueMail(tx, …)` runs INSIDE the business transaction;
  `dispatchOutbox()` runs after it, from a Vercel Cron sweep every two minutes. An order that
  commits always has its confirmation queued, and a transport outage can never roll back an
  order. Sending inside the request gives you exactly one of those two properties.
- **`sendOrQueue` for mail a person is waiting on** — verification, password reset. Send now;
  fall back to the outbox only on a *retryable* failure. A permanent failure (a malformed
  address) is not queued, because queueing it just schedules six identical failures.
- **Idempotent by `dedupeKey`**, unique and nullable: `order-confirmation:<orderId>` can be
  queued once no matter how many times the business event retries, while a second
  password-reset request passes NULL and is exempt.
- **Claimed with `UPDATE … FOR UPDATE SKIP LOCKED`**, so two concurrent sweeps cannot send the
  same row twice.
- **Backoff, then stop.** 1, 5, 15, 60, 360 minutes and then FAILED. Retrying forever turns
  the outbox into a queue of permanent failures nobody reads.
- **Six templates, both languages**, table-based with inline styles and `dir="rtl"` for
  Arabic, because email clients are not browsers. Subjects live with the bodies, which is what
  stops an Arabic email arriving under an English subject.

## Consequences

- The cron route lives in `apps/www`, not `packages/database`: it needs both packages, and
  `@repo/mail` already depends on `@repo/database`. A cycle between two workspace packages is
  a build problem waiting for the wrong bundler.
- Without `RESEND_API_KEY` the console transport logs instead of delivering, and says so. The
  fallback exists so a developer never has to comment out a send — which is how a codebase
  acquires a second, local-only code path.
- **A runtime bug the type checker could not see**: rendering under plain tsx threw
  `ReferenceError: React is not defined`, because this package is transpiled by Next's SWC
  (automatic JSX runtime) in the app and by tsx (classic runtime) in the sweep and in scripts.
  Found by rendering a template, not by compiling one. The fix is an explicit
  `import * as React` in the three `.tsx` files.
- Resend domain verification (SPF, DKIM, DMARC on a mail subdomain) is the owner's task and
  blocks actual delivery, not the build.

## Amendment — 2026-09-10, SMTP removed

An SMTP transport (Nodemailer) was added after this ADR was accepted and became the only
transport. It is now removed and the decision above stands as originally written: Resend's
HTTP API, no SDK, one POST to `/emails`.

- **`transport/resend.ts` replaces `transport/smtp.ts`**, and `nodemailer` is no longer a
  dependency of any package.
- **Retryable is an HTTP status question**: 408, 429 and 5xx are deferrals the outbox backoff
  should retry; 401, 403, 422 and the rest are permanent, because a wrong key or an
  unverified domain fails identically on every attempt.
- **The sweep is paced.** A Resend account allows 2 requests/second by default and
  `dispatchOutbox` sends a claimed batch in a loop, so the transport holds a minimum interval
  between sends (`RESEND_MIN_INTERVAL_MS`, default 550ms). Without it a batch of 25 earns
  itself 429s that cost a minute of backoff each.
- **Outbox rows carry an `Idempotency-Key`** derived from the row id, so a sweep that dies
  after Resend accepted a message but before the row was marked SENT cannot send it twice.
