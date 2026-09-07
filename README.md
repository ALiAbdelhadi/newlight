# NewLight

A lighting catalogue and store for the Egyptian market, in Arabic and English, with an internal
admin panel behind it. Turborepo, pnpm workspaces, Next.js 16, Prisma against Neon Postgres.

```
apps/
  www      the storefront — public, bilingual (en/ar, RTL), cart, checkout, orders
  admin    the admin panel — private, English-only by design
packages/
  database @repo/database — Prisma schema, the migration chain, and the domain boundaries
           both apps must agree on (money, locale, translation, slug, inventory)
  mail     @repo/mail — transactional email through a transactional outbox
  eslint-config · typescript-config
```

## Getting it running

Requires Node 22+, pnpm 10.31, and a PostgreSQL you can create and drop databases on.

```bash
pnpm install
pnpm dev                 # www on :3000, admin on :3001
```

Each app reads `.env.local`; `packages/database` has its own, because Prisma's CLI only reads
`.env` and every database command goes through `scripts/with-env.mjs` to load the right one.

## The commands that matter

```bash
pnpm check-types         # task-count guard + the ratcheting error budget
pnpm lint
TEST_DATABASE_URL=postgresql://$USER@localhost:5432/postgres pnpm test
```

`pnpm check-types` is not `tsc`. It asserts that the type check actually ran in all four
packages and that each is within its error ceiling — a ceiling that may only ever decrease. A
task that runs nowhere exits 0 and verifies nothing, which is the failure this guards against.

Tests give each test **file** its own disposable database and apply the real migration chain to
it — not `db push`, which would test a schema no deployment produces.

All three run on every push and pull request: `.github/workflows/verify.yml`.

## The database

```bash
cd packages/database
pnpm db:generate                # after any schema change
pnpm db:migrate                 # create a migration
pnpm db:status
SHADOW_DATABASE_URL=… pnpm db:verify-chain   # replaying the chain reproduces schema.prisma
```

`db:verify-chain` is the one to know about: it replays all fourteen migrations into a throwaway
database, diffs the result against `schema.prisma`, and asserts the four CHECK constraints
Prisma cannot express and `migrate diff` cannot see. CI runs it.

**Production is read-only** until the cutover, and `with-env.mjs` enforces that rather than
trusting anyone to remember: a write-capable command aimed at the production endpoint refuses
to run.

## Things that are true here and surprise people

- **Money is never a `number`.** `Decimal` in the database, `packages/database/money.ts` is the
  only thing that touches one, and it crosses into a Client Component as a **string** — React
  cannot serialise a Decimal at all.
- **Slugs are per-locale**, on the translation rows. Products keep one slug across both.
- **Stock is an append-only ledger.** `StockMovement` is the truth and `StockLevel` is derived;
  `inventory.ts` is the only writer, including for the migration.
- **Order status is a state machine** with an explicit table of legal transitions and who may
  make them. Payment settles in exactly one place.
- **Translations are never silently filled in.** A missing Arabic name is reported as missing,
  not quietly replaced with the English.

## Where the reasoning is written down

- `docs/adr/` — the eight decisions that shaped the rest
- `docs/schema-v2-amendments.md` — every amendment to the plan, numbered, with why
- `docs/cutover-runbook.md` — the production cutover, step by step, rehearsable with
  `pnpm --filter @repo/database cutover:rehearse`
- `docs/gaps-audit.md` — what is still missing
- `CLAUDE.md` — conventions, in the form the tooling reads
