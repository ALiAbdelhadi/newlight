# Storefront pass, product images, and the naming problem

Not a phase from §26 — there is no P7 in the BUILD spec, which ends at P6. This is the work
that was actually left. Decisions in [schema-v2-amendments.md](schema-v2-amendments.md) A82–A91.

```
0 type errors (4 packages) · 0 lint errors · 187 tests passing
```

---

## 1. Product images: the gap, and the answer

Asked directly whether the admin panel can add and edit product photographs, the answer was
**no**. The P5 workbench displayed them and did nothing else — no upload, reorder, deletion,
colour link or alt text, for a lighting catalogue where the photograph *is* the product (A85).

There is a Photos tab now, and it was exercised against the live system:

| | |
|---|---|
| Reorder | Clicked in the browser; main photo changed, header thumbnail followed, database and audit row confirmed |
| Upload | Real file to the real Cloudinary account: **200**, publicly readable, then destroyed |
| Delete | `{"result":"ok"}` — and the URL still answered 200 from the CDN, which was a defect (A86) |

The reasoning that shaped it: **order is the model** (position 0 is the listing image, so a
separate "main" flag would be a second answer to one question); **reorder is by button, not
drag** (a drag target is invisible to a keyboard); **uploads mint the same `public_id` shape the
migration produced**, so `media:verify` keeps working; **the row is written only after
Cloudinary accepts the file**; and **deleting a row destroys the asset only if no other row
shares it**, because the migration deliberately let products share photographs.

## 2. Six defects the storefront pass found

None was visible to `tsc`, ESLint, or 184 tests.

| | |
|---|---|
| **`Decimal` into Client Components** (A82) | 231 console errors per page. Three components took raw Prisma rows and called `serializeMoney` themselves — the money boundary enforced on the wrong side of itself |
| **`averageCost` in the payload** (A87) | What NewLight *pays*, shipped to every browser. Null today only because no cost is recorded — and P5's bulk cost entry exists to change that |
| **`Math.random()` in a server component** (A83) | The home page chose its featured products randomly, per render |
| **Authentication broken by i18n** (A84) | `/api/auth/get-session` → 404. The middleware localised Better Auth's endpoints, so no client-side session read ever worked |
| **The sitemap advertised a 404** (A88) | `/about-us` does not exist; the route is `/about`. Now guarded by a test that fails if the fix is reverted |
| **A hydration mismatch the auth bug was hiding** (A89) | Only appeared *after* the endpoint was fixed and sessions began resolving |

The last one is the shape worth remembering: fixing one defect revealed another it had been
masking, and a console that gets louder after a fix is not evidence the fix was wrong.

## 3. Names: proposed, not decided

Every one of the 378 `ProductTranslation.name` values is the product's own SKU (A26). A customer
sees `nl-1046-2w` where a name belongs.

```bash
pnpm --filter @repo/database names:propose   # writes data/name-proposals.json, touches nothing
pnpm --filter @repo/database names:apply     # refuses any row still marked needsReview
```

```
189 proposals · 55 unambiguous · 134 need a person
  12 have a SKU that disagrees with their own recorded wattage
  23 proposed names are shared by more than one product
```

Names are how the business describes itself, so the script writes a file and stops. Two
commands, because generating a name and committing it are different decisions — and clearing
`needsReview` is the acknowledgement.

It surfaced two data problems on the way: **12 SKUs disagree with their own recorded wattage**
(`nl-1051-3w` records 2W), and **four Arabic taxonomy names carry a trailing space** while seven
contain Latin script — some legitimately, like `COB` and `LED`, some not, like `Cylinder` and
`Wall Washer` (A90, A91). All of it is reported in the admin's data-quality queue and repaired
by nothing.

## 4. What was checked and found clean

- Both locales, desktop and mobile — Arabic RTL renders correctly, prices carry one symbol in
  Arabic-Indic digits (`٦٩٣ ج.م`), no horizontal overflow once animations settle
- Every public page returns 200; 439 sitemap URLs, sampled across both locales
- Add-to-cart signed out gives a clear message rather than failing silently
- Product images throughout are served from Cloudinary, none broken

## 5. Still open

Unchanged, and all yours:

1. **Neon PITR retention** — read the window in the console
2. **Resend sending domain** — until then mail is queued and logged, not delivered
3. **Rotate the seeded SUPER_ADMIN password**
4. **Say when** for the cutover — production has still never been written to

And one thing I have not done because you have not asked: **199 changed files across P1–P7 are
uncommitted**, on `main`, with the last commit still `980e47b`.
