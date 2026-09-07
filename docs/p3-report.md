# P3 — storefront adaptation

**`www` is at zero type errors.** That is P3's §26 exit criterion, and it is the honest measure
of "the storefront runs on v2": every read goes through the new schema, every price through the
money boundary, every URL through per-locale slugs.

Decisions in [schema-v2-amendments.md](schema-v2-amendments.md) A38–A46.

---

## 1. The gates

```
[budget] @repo/database      0 errors /    0 allowed  at
[budget] www                 0 errors /    0 allowed  at     ← 112 at P2 exit
[budget] admin              99 errors /   99 allowed  at     ← 110 at P2 exit
[budget] @repo/mail          0 errors /    0 allowed  at

lint    4 packages, 0 errors
chain   replaying every migration reproduces schema.prisma exactly, 4 check constraints present
```

The ratchet did its job twice this phase: it refused a stale `www` ceiling, and it caught
`admin` drifting **down** to 99 without anyone noticing — P3's shared work cleared 11 of its
errors as a side effect.

## 2. Verified in a browser, not inferred from the type checker

Everything below was checked against the running app on real production data.

**Arabic taxonomy URLs resolve.** `/ar/category/اضاءه-داخليه` (percent-encoded) renders 11
Arabic sub-categories. That is the A6 slug rule, the `@@unique([locale, slug])` index and the
encode-at-the-boundary rule all working together.

**The product page renders the whole of P1.** On `/ar/.../nl-r-ds-5w`:

| | |
|---|---|
| Arabic spec labels from `SpecDefinition.labelAr` | `جهد الدخل`, `التدفق الضوئي`, `أقصى درجة الحماية` — every A1–A3/B correction |
| Per-locale units | `5 W`, `350 lm`, `60 °`, **`50000 ساعة`** — the reason `unitEn`/`unitAr` exists (A2) |
| The IP coercion | `درجة الحماية: IP20`, not `درجة الحماية: 20` (A1) |
| Values preserved verbatim | `≥ ٨٠`, `٩٠x٤٥ مللي` — Arabic-Indic digits untouched (N4) |
| Family variants | `5W` / `6.5W` with prices, from `familyId` (§6) |
| Colours | `أبيض`, from `ProductColor.nameAr` (§8) |
| Money | `١٦٥ ج.م` — Arabic-Indic digits, symbol after the amount |

**The 301s work.** `/en/category/indoor/panel/nl-60*60-led` — an old SKU URL — resolves to the
same page as `.../nl-6060-led`, through `ProductSlugHistory`.

**The sitemap emits both languages.** 437 URLs: 220 English, 216 Arabic, 766 hreflang
alternates, Arabic slugs percent-encoded, every product under the taxonomy path for its own
locale.

## 3. What changed

**The service layer was rewritten, not patched.** `category-service`, `product-service`,
`search-service`, `cart-service` and `order-service` now read translation slugs, `ProductImage`,
`ProductSpec`, `ProductFamily` and the stock ledger. Shared query fragments live in
`lib/services/selectors.ts`; slug resolution and the 301 decision live in
`lib/services/taxonomy.ts`.

**Every `as unknown as` cast on a Prisma result is gone** (A39) — which is precisely why
deleting a column from the schema used to produce no error at the call sites that read it.

**The route tree was renamed** (A38): `category/[category]/[subCategory]/[product]`. v1's
segments held the wrong things under the right-sounding names.

**Two files that did not exist now do**: `app/sitemap.ts` and `app/robots.ts` (A44). Plus
`app/api/revalidate/route.ts` (§23, A45) and `lib/cloudinary-loader.ts` (ADR 0002).

## 4. Defects found and repaired

**Search was hardcoded to English** (A40) — `const searchLocale = "en"`, with a comment saying
so. Arabic search matched nothing.

**Three price formatters disagreed** (A41). One now, taking `MoneyInput` rather than `number`.
Folding the admin's into it cleared 12 of that app's errors by itself.

**The currency symbol rendered twice** in three places once formatMoney owned it — `ج.م165.00`
with no space and the symbol on the wrong side. Found by looking at the page.

**The metadata calls passed the wrong parameter names** — `{sectionType}` where the message
wanted `{section}` — so the sub-category page's `<title>` was the literal string
`metadatas.section-type-page.title`. Also found by looking, not compiling.

**The silent translation fallback is gone** (A42), and the footer's two hardcoded
`indoor`/`outdoor` columns with it (A43).

**Two lazy-create sites deleted** — `UserService.getOrCreateUser` and its four call sites (§7).
They upserted a user row from an id nobody had registered.

**`ProductService.reserveInventory` / `releaseInventory` deleted** (§8.2, §13.2) — the second
of v1's three inventory-mutation paths, a check-then-mutate pair with no transaction and no
callers. `order-service` now reserves through the ledger and releases on cancel.

## 5. Deferred, with reasons

**Sentry and analytics** (A46). Both need values the owner has not supplied
(`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) and both are additive. Wiring them against a
placeholder would be worse than not wiring them.

**Cloudinary is still the open item from P1.** The loader is written and both apps' CSP and
`remotePatterns` already allow `res.cloudinary.com`; the 347 images are scanned and waiting on
three credentials. Until then `ProductImage.url` holds repo paths — which is why the images in
the screenshots above load at all.

## 6. What P3b starts from

- `order-service` already reserves and releases through `packages/database/inventory.ts`; P3b
  adds the `SALE` movement on ship, the `RETURN` on refusal, and the state machine (ADR 0005).
- The third mutation path — admin's — is untouched and is P5's.
- `getProductBySlug` already resolves availability as `onHand - reserved`, so the storefront's
  stock reads go through one helper (§13.4).
