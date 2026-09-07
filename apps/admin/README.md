# apps/admin — the admin panel

Private. English-only by design; there is no i18n here and that is deliberate.

See the [repository README](../../README.md) for how to run the monorepo — this app is not
meant to be started on its own, because it shares `@repo/database` and `@repo/mail` with the
other one.

```bash
pnpm dev --filter admin
pnpm build --filter admin
pnpm lint --filter admin
```
