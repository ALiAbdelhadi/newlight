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
