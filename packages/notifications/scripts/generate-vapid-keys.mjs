/**
 * Print a fresh VAPID key pair.
 *
 *   pnpm --filter @repo/notifications vapid
 *
 * The pair identifies THIS deployment to the browser vendors' push services, and the public
 * half is baked into every subscription a browser issues. So rotating it invalidates every
 * existing subscription: every administrator has to enable notifications again, and until they
 * do the sweep gets 403s that it correctly refuses to treat as "the endpoint is gone". Generate
 * once per environment and keep it.
 *
 * The private key is a credential. It goes in the environment, never in the repository.
 */
import webpush from "web-push"

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log(`
Add these to the environment of BOTH apps (the storefront runs the sweep, the admin panel
serves the public key to the browser):

  VAPID_PUBLIC_KEY=${publicKey}
  VAPID_PRIVATE_KEY=${privateKey}
  VAPID_SUBJECT=mailto:you@example.com

  NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}

NEXT_PUBLIC_VAPID_PUBLIC_KEY is the same value as VAPID_PUBLIC_KEY. It is duplicated because
the browser needs it before it can subscribe, and only NEXT_PUBLIC_ variables reach the
browser. VAPID_PRIVATE_KEY must never be given that prefix.

The storefront also needs PUSH_SWEEP_CRON_SECRET for /api/cron/push, alongside the secrets the
other two sweeps already use.
`)
