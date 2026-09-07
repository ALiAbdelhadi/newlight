# apps/www — the storefront

Public, bilingual, and the only app customers see.

See the [repository README](../../README.md) for how to run the monorepo — this app is not
meant to be started on its own, because it shares `@repo/database` and `@repo/mail` with the
other one.

```bash
pnpm dev --filter www
pnpm build --filter www
pnpm lint --filter www
```
