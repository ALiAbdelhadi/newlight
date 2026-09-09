# §17 — Notifications and Web Push

What A8 deleted and why this is not a resurrection of it, what the two halves of the system
are, what has to be in the environment, and what happens when any of it is missing.

## What was there before

A8 removed `PushSubscription`, `web-push`, the VAPID variables, `apps/www/app/action.ts` and
both service-worker push handlers. The channel queried a `push_subscriptions` table that did
not exist in production, nothing in either app ever called `subscribe()`, and the handlers
listened for a message no server could send — so it could not have delivered anything. Its
closing line was that push, if wanted later, is a **greenfield addition on the notification
model**. This is that addition.

## The two halves

A notification has a durable half and a best-effort half, and keeping them separate is the
whole design.

| | |
|---|---|
| **The row** — `notifications` | Written **inside** the transaction of the event that caused it, for recipients resolved **outside** it. It is the truth, and the admin bell reads it. |
| **The push** — Web Push | Sent **after** the commit. A nudge toward a row that already exists. |

So an order that commits always has its notification, and a push service that is unreachable
can never roll back an order. This is the same shape §16 gave email in migration 0012, for the
same reason.

`notifications.pushedAt` is what makes the table its own outbox. NULL means "the sweep has not
handled this row"; it is stamped once the fan-out has been attempted — success **or** permanent
failure. The stamp goes on **before** the send, which trades a lost push on a crash for a
guarantee against a duplicate one. That is the right way round: the row is in the bell either
way, and being told twice about the same order erodes trust in the channel faster than being
told once, late.

## Where each piece lives

```
packages/notifications/          the only writer of notifications, and the only sender of push
  index.ts                       adminRecipients (BEFORE the transaction), notifyRecipients /
                                 notifyUser (inside it), dispatchPush (the sweep),
                                 saveSubscription / removeSubscription
  push.ts                        the web-push seam. sendPush NEVER THROWS; it returns
                                 accepted / gone / failed, because those lead to three actions
  scripts/generate-vapid-keys.mjs

apps/admin
  app/api/push/subscribe/route.ts   GET config · POST subscribe · DELETE unsubscribe
  public/sw.js                      push, notificationclick, pushsubscriptionchange
  components/shell/notification-bell.tsx
  hooks/use-notifications.ts        polls AND listens for push; both, never one
  lib/push-client.ts                permission, subscribe, feature detection
  lib/chime.ts                      the sound, synthesised rather than shipped

apps/www
  app/api/cron/sweep/route.ts       all three sweeps behind one URL; what the schedule calls
  app/api/cron/push/route.ts        the push sweep on its own, for running it during an incident
```

The sweep lives in `apps/www` because Vercel crons are configured per project and this
repository declares its crons in `apps/www/vercel.json`. The recipients are administrators, but
signing a Web Push payload does not require being the admin app.

It is no longer scheduled on its own. The Hobby plan allows two cron jobs at daily granularity,
which cannot express "three sweeps, every two minutes", so an external caller drives
`/api/cron/sweep` — which runs the reservation, mail and push sweeps in that order — and the
one entry left in `vercel.json` runs the same URL daily as a safety net. Frequency therefore
lives with whoever owns that external schedule, not in this repository.

## Who raises what

| Event | Type | Priority | Raised in |
|---|---|---|---|
| An order is placed | `NEW_ORDER` | HIGH | `apps/www/lib/services/order-service.ts` |
| A **customer** cancels | `ORDER_CANCELLED` | HIGH | `apps/www/lib/services/order-transitions.ts` |
| The contact form is submitted | `NEW_CONTACT_FORM` | NORMAL | `apps/www/app/[locale]/api/contact/route.ts` |
| Stock crosses the threshold | `LOW_INVENTORY` | — | `packages/database/inventory.ts` |

An admin-driven cancellation raises nothing. They are the one who made it, and telling every
administrator about each other's actions is how a notification channel becomes noise people
stop reading.

## Environment

```
VAPID_PUBLIC_KEY=…
VAPID_PRIVATE_KEY=…            a credential; never give it the NEXT_PUBLIC_ prefix
VAPID_SUBJECT=mailto:…         push services use it to contact you about abuse
NEXT_PUBLIC_VAPID_PUBLIC_KEY=… the same value as VAPID_PUBLIC_KEY; the browser needs it to subscribe

PUSH_SWEEP_CRON_SECRET=…       apps/www only, for /api/cron/push on its own
CRON_SECRET=…                  apps/www only, for /api/cron/sweep; the name Vercel Cron itself sends
```

Generate a pair with `pnpm --filter @repo/notifications vapid`. **Generate once per environment
and keep it**: the public half is baked into every subscription a browser has issued, so
rotating it silently unsubscribes every administrator until each of them enables notifications
again.

## What happens when something is missing

Every one of these is a working system with one capability absent, never a broken one.

- **No VAPID pair.** The sweep does **nothing at all** — it does not claim and it does not
  stamp, so every row waits for a configured deploy rather than being lost. Notifications still
  appear in the bell; the bell says "VAPID keys are not set on the server" instead of offering
  a switch that does nothing. The configuration check comes before the stale-stamping for
  exactly this reason; see the review note below.
- **The administrator declined the browser prompt, or is in a private window, or is on an
  iPhone that has not added the panel to the Home Screen.** The bell polls — every 15s while
  the tab is visible, eight times slower when it is not — and says which of those it is.
- **The push service is down.** `sendPush` returns a retryable failure, `failureCount` is
  incremented, and the subscription survives. Ten consecutive non-`gone` failures retire it.
- **The endpoint is dead** — 404 or 410, the only two statuses that mean that. The subscription
  is deleted on the spot. A **403 is not** one of them: that is a wrong VAPID key, a deployment
  mistake, and pruning on it would unsubscribe everybody the first time a key is rotated badly.
- **The sweep has been down for hours.** Anything older than an hour is stamped without being
  sent. Fifty pushes about work already on the screen is not a recovery.

## The order confirmation carries the product

The same workstream widened `OrderLine` from a name, a quantity and a price to the whole
product: the image of the colour that was chosen, the code, the colour temperature, the colour,
and the specifications — resolved into the **customer's** language, not the default one.

Every new field is optional and stays that way. Payloads live in `EmailOutbox.payload`, so a
row queued before a deploy is rendered by the code after it, and a confirmation queued the
minute before these fields existed still has to render. `packages/mail/test/templates.test.tsx`
holds that guarantee with a test that renders the old shape.

## Verified

- `notifyAdmins` rolls back with its transaction, writes one row per administrator by ROLE, and
  does not fail the event when no administrator exists.
- The sweep claims a row once. A second sweep claims nothing — the property that makes the
  immediate dispatch and the cron tick safe to overlap.
- A dead FCM endpoint is pruned; a transport failure that never said "gone" is not.
- An endpoint re-subscribed from the same browser updates its row rather than adding one, and
  moves to whoever is signed in on that machine.
- One administrator cannot unsubscribe another.
- With no VAPID pair the sweep claims nothing and the rows stay unpushed.

`packages/notifications/test/notifications.test.ts`, 11 tests, against a disposable database
with the real migration chain applied.

The bell itself was rendered and photographed in light and dark, with the mark-all-read
optimistic update observed dropping the badge before the request resolved.

## The bug that only rendering could find

`useNotifications` passed a **function** as React Query's `refetchInterval`, and that function
read `document.visibilityState` to poll slower in a backgrounded tab. React Query evaluates a
functional `refetchInterval` during the render — including the SERVER render, which a
`"use client"` component still gets. So:

```
ReferenceError: document is not defined
    at Object.refetchInterval (hooks/use-notifications.ts:51)
```

a 500 on **every** admin page, because the bell lives in the shell. `tsc --noEmit` was clean
and `next build` was clean, both correctly: `document` is a legitimate global in a file typed
with the DOM lib, and the admin's pages are all dynamic, so nothing was rendered at build time.

It was found by putting the component on a screen. The guard is `typeof document === "undefined"`
first, with the reason written above it — the same class of defect as A35, where JSX with no
`React` in scope type-checked perfectly and threw at render.

## Confirming a banner actually arrives

The one link no automated test can exercise: an OS banner on a real machine. It needs a person
to grant the browser permission, which is a click nothing else can make.

1. Sign in to the admin panel, open the bell, and switch **Browser notifications** on. The
   browser asks; allow it.
2. Then:

```bash
cd packages/database && node scripts/with-env.mjs tsx ../notifications/scripts/send-test-notification.ts
```

It raises one real notification, runs the sweep, prints what happened, and deletes the row
before it exits — the banner is on screen and the notification it came from is gone, which is
the right trade for a probe. It refuses, with the reason, when VAPID is unset, when no
administrator exists, or when nobody has subscribed yet:

```
1 administrator(s), 0 subscribed browser(s).
Nobody has enabled browser notifications yet — open the bell in the admin panel first.
```

It runs from `packages/database` because that is where `with-env.mjs` lives — the only loader
that reads `.env.local` for a CLI and refuses to point a write at production. The VAPID pair
therefore has to be in `packages/database/.env.local` too, not only in the two apps.

## What the review changed

Written down because each of these was a defect the tests and the type checker were both happy
with.

**The sweep swallowed a backlog it could not send.** The stale-stamping `UPDATE` ran *before*
the "is VAPID configured" check, so a deployment with no keys still stamped every notification
older than the window as handled, every two minutes. Adding the keys a week later would deliver
nothing that had aged past the window while they were missing — precisely the notifications the
operator was turning push on to stop missing. The check now comes first and an unconfigured
sweep writes nothing. `packages/notifications/test/notifications.test.ts` has the regression,
and it was confirmed to fail against the old ordering before being kept.

**A talkative customer could suppress their own cancellation.** A Web Push message is capped at
about 4KB and `message` carries the customer's own cancellation reason, which nothing upstream
bounds. An oversized payload is rejected by the push service, so the notification would silently
not arrive. Title and body are clamped for the banner only; the row keeps the full text and the
bell shows all of it.

**An administrator clicking "off" mid-sweep could take the sweep down.** Success and failure
were recorded with `prisma.pushSubscription.update`, which throws `P2025` when the row has been
deleted — and the sweep had already stamped every row it claimed, so those were lost with it.
Both are `updateMany` now: a write that matches nothing is the right outcome.

**The bell could hide a new notification completely.** `/api/notifications` ordered by priority
before date. Nothing had ever read the endpoint, so nobody had seen what that does: it pins a
week-old HIGH row above this morning's news, and with a limit of thirty it means a brand-new
NORMAL notification does not appear at all once thirty HIGH ones sit above it. Now newest first.
Priority is carried by the accent colour and by whether the OS banner stays on screen.

**`expiresAt` was a field that silently did nothing.** It is in the model and in
`NotificationInput`, and no reader filtered on it. Both the list and the badge count now honour
it — a badge counting rows the list refuses to show is a badge that never reaches zero however
much the person reads.

**A confirmation could name a blank product.** `describeOrderedProduct` returned `name: ""` on
its defensive branch. It cannot be reached — it is a `findUnique` by an id loaded in the same
transaction — but a defensive branch whose output is worse than no branch is not defensive. It
now falls back to the name the caller already priced the order against, and the untranslated
case falls back the same way.

**Every checkout held a read-lock over the whole `users` table.** `notifyAdmins` resolved the
administrators and wrote their rows in one call, both inside the caller's transaction. Order
creation is the only SERIALIZABLE transaction in the repository, and `EXPLAIN` on that lookup is
a **Seq Scan** — the planner ignores `@@index([role])` because `users` is small, and will keep
ignoring it while the administrators are a handful of rows among the customers. Postgres locks a
sequential scan under SSI at RELATION granularity, so every checkout took a predicate lock on
the entire table.

A single rw-dependency is not an abort on its own, so this was **measured rather than assumed**.
Against a transaction that reads `notifications` and writes `users`, the cycle closes and one of
the pair dies with a serialization failure — and in the run it was the **sign-up** that died, not
the order:

```
T1 (order-shaped):  committed
T2 (signup-shaped): ABORTED — write conflict / serialization failure
```

Which side loses depends on the interleaving, and neither should have been abortable by the
other. No current code path forms exactly that cycle, so the change is prophylactic rather than a
fix for an observed outage — but it costs nothing, because outside the transaction the same query
takes no predicate lock at all.

The API is now split so the mistake cannot be made again: `adminRecipients(prisma)` reads, and
`notifyRecipients(tx, recipients, input)` writes and reads nothing. There is deliberately **no**
convenience wrapper that does both — one that is correct at READ COMMITTED and quietly wrong at
SERIALIZABLE is the footgun the split exists to remove. A test writes a notification for a
CUSTOMER id to prove the write consults no table.

**A refused subscription was undiagnosable.** The endpoint allowlist rejects hosts that are not
a known push service, which is what stops this route making authenticated requests to a URL of
the caller's choosing. A vendor issuing endpoints on a new hostname would look, from the
administrator's side, like a switch that simply does not work. The host — and only the host, the
rest is a device identifier — is now logged on refusal.