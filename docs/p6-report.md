# P6 — media migration and cutover preparation

**347 files on Cloudinary, 371 catalog images repointed, the cutover rehearsed end to end, and
every automatic check green. Production untouched.** Decisions in
[schema-v2-amendments.md](schema-v2-amendments.md) A66–A81; the sequence itself is
[cutover-runbook.md](cutover-runbook.md).

```
[media] uploaded 347 file(s); 0 failure(s)
[sync]  371 updated  ·  second run: 0 updated, 371 already pointing at Cloudinary
[media] v2 catalog: 371 images; 0 with no manifest entry
[media] 347 of 347 URLs return 200
[preflight]  8 passing, 0 failing, 4 needing a person
[rehearse]   189 products -> 2051 specs -> schema reproduces exactly, 0.9s
0 type errors (4 packages) · 0 lint errors · 184 tests passing
```

---

## 1. Production was not written to

You said not yet, so nothing here touches `ep-round-river`. Every command ran against the
branch, and `with-env.mjs` refuses write-capable commands against production regardless.

What P6 covers instead: the Cloudinary migration, which needed no cutover; and making the
cutover itself executable rather than described.

## 2. The media migration is done on the branch

The scan was already complete from P1 — 347 entries, no URLs, because the credentials were
missing. They were present in `apps/admin/.env.local` only, and empty in the other two env
files, including the one the migration actually runs from. Propagated, then:

| Step | Result |
|---|---|
| `media:upload` | 347 files, 233 MB, **0 failures** |
| `media:sync` | 371 catalog images repointed; a second run changed **0** |
| `media:verify` | 347/347 URLs return 200, 0 images without a manifest entry |
| Browser | Arabic RTL category page: 11 Cloudinary images, **0 broken** |

`media:sync` is new. The transform writes `url: entry.url ?? path`, so a catalog transformed
while the manifest was still local holds local paths — and it cannot be re-run, because `0011`
has removed the columns it reads. It does not need to be: the transform also writes `publicId`,
derived from the file rather than from Cloudinary, so the rows can be matched to the manifest
afterwards (A67).

## 3. One defect found

**`media:verify` could not run on a fully migrated catalog.** It calls `collectReferences`,
which reads v1's `products.images` — a column `0011` drops. It failed with
`column "images" does not exist`, and would have failed identically in the cutover window,
immediately after the transform, which is precisely when it is wanted (A66).

It now asks whichever question the database in front of it can answer, and `collectReferences`
is untouched because `media:scan` runs before the transform and needs it as it is.

## 4. The cutover is now a script plus a runbook

`pnpm --filter @repo/database cutover:preflight` — read-only, and it never says "READY".

```
[ok  ] 20.2   catalog export exists                189 products, 4.6h old
[ok  ] 15.1   media manifest fully uploaded        347/347, provider "cloudinary"
[ok  ] 15.2   catalog images point at Cloudinary   371/371 remote
[ok  ] 13.1   branch has the whole migration chain 14/14
[ok  ] 13.2   catalog reconciles with production   189 / 2051 / 378 / 232454.00
[ok  ] 7.1    an administrator exists              1
[ok  ] N1     opening stocktake state is recorded  pending
[ok  ] 20.1   legacy JSON is no longer read        3 files present, referenced by nothing
[OPEN] 20.5   Neon PITR retention confirmed
[OPEN] 20.7   restore proven into an empty database
[OPEN] P2.1   Resend sending domain verified
[OPEN] P5.1   seeded SUPER_ADMIN password rotated
```

The OPEN rows cannot be read from this environment and are never inferred (A69).
[cutover-runbook.md](cutover-runbook.md) is the ordered execution of ADR 0006 — before the
window, the window itself, the smoke test, rollback at each stage, and what to do after.

## 5. The cutover has been rehearsed, end to end

```bash
pnpm --filter @repo/database cutover:rehearse
```

Dumps production **read-only**, restores into a throwaway database on localhost, and runs the
whole sequence — baseline, `0001`–`0010`, transform, `0011`–`0013` — then checks the result
against `schema.prisma`. It refuses any target not on localhost and never names the branch.

It found a defect in my own runbook on its first run (A78): the baseline step was missing, so
step 3 failed with `type "available_colors" already exists`. A runbook nobody has executed is a
hypothesis.

Result:

```
restored: 189 products, price sum 232454.00
[4/9] product specs 2051 · [6/9] images 371 · [8/9] 189 INITIAL movements
ok  product count 189 · sum(price) 232454.00 · translations 378 · families 89
schema: reproduces schema.prisma exactly
```

## 6. The transform was never slow — the round trips were

The same transform, same data, measured (A79):

| | |
|---|---|
| against a local PostgreSQL | **0.9 s** |
| against Neon | **~15 min** |

A thousandfold difference from identical code. The work is trivial; the cost is entirely
latency × requests. The per-row `upsert` loops are now batched through
`prisma.$transaction([...])`, and the 189 opening-balance movements share one transaction
instead of 189 — verified byte-identical against the same production dump (A80).

The ledger is deliberately not batched: `recordMovement` is the only writer of the stock ledger
and going faster by bypassing it would break the invariant it exists to hold.

**Where it runs now matters more than what it does**, and the runbook says so.

## 7. The legacy JSON stays

Nothing imports it — the preflight greps for that on every run, closing the one §20 condition
that is a fact about the code. Conditions 5 and 7 are still open, and "nothing imports it" is
not "we can get it back" (A81).

## 8. Owed by you, before anything is promoted

1. **Neon PITR retention** — read the window in the console
2. **Resend sending domain** — until then mail is queued and logged, not delivered
3. **Rotate the seeded SUPER_ADMIN password** — it is in a session transcript
4. **Say when** — cutover writes to production for the first time since P1

## 9. The visual pass is done

All five P5 screens were walked in a browser, and it found five defects the type checker, the
linter and 184 tests could not (A73–A77) — an app-wide hydration error from one Radix
attribute, a class of unordered queries whose rendered output could differ between renders,
`EGP` printed twice, a stale dev server, and a shared-password gate at `/` that protected
nothing and was dead on top of it. All fixed.

Price editing and specification editing were exercised end to end against the live admin:
`nl-p-12w` 693.00 → 750.00 and back, both changes in the price history with the actor; a
specification changed and reverted, with the audit rows to match.
