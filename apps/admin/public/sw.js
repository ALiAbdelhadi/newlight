/*
 * The admin service worker — BUILD §17.
 *
 * Its only job is push. There is no offline caching here on purpose: the admin panel is an
 * authenticated view of live data, and a cached order list is a lie about the state of the
 * business. What a stale storefront page costs is a slightly old price; what a stale admin
 * page costs is shipping something that was cancelled.
 *
 * This replaces the two handlers A8 deleted. Those listened for a message no server could
 * send, because nothing ever subscribed and the table they were keyed on did not exist. This
 * one is paired with /api/push/subscribe and the sweep in @repo/notifications.
 */

self.addEventListener("install", () => {
    // Take over immediately. A worker waiting for every tab to close means a fix to this file
    // ships whenever the administrator happens to quit their browser, which is never.
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    /*
     * Never trust the payload to be there or to be JSON. A push service may wake a worker with
     * no data at all — Safari does — and a handler that throws on that shows nothing, which on
     * several browsers costs the subscription itself after a few repeats.
     */
    let payload = {};
    if (event.data) {
        try {
            payload = event.data.json();
        } catch {
            payload = { title: "Newlight", body: event.data.text() };
        }
    }

    const title = payload.title || "Newlight admin";
    const urgent = payload.priority === "URGENT" || payload.priority === "HIGH";

    event.waitUntil(
        Promise.all([
            // Tell any open admin tab to re-read the list. The payload is NOT handed over as
            // data to render: the row in the database is the truth, and a tab that refetches
            // stays correct when two notifications arrive in the same second.
            self.clients
                .matchAll({ type: "window", includeUncontrolled: true })
                .then((clients) => clients.forEach((client) => client.postMessage({ type: "notification" }))),

            self.registration.showNotification(title, {
                body: payload.body || "",
                icon: "/web-app-manifest-192x192.png",
                badge: "/favicon-96x96.png",
                /*
                 * Tagged by notification id, so the immediate push and a retry from the cron
                 * sweep collapse into one banner rather than stacking two identical ones.
                 * `renotify` keeps the alert audible when a genuinely new notification
                 * reuses a tag.
                 */
                tag: payload.notificationId || payload.type || "newlight",
                renotify: true,
                // Urgent things stay on screen until acknowledged; routine ones do not nag.
                requireInteraction: urgent,
                silent: false,
                timestamp: payload.at || Date.now(),
                data: {
                    url: payload.url || "/admin/dashboard",
                    notificationId: payload.notificationId || null,
                },
            }),
        ])
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const target = (event.notification.data && event.notification.data.url) || "/admin/dashboard";

    event.waitUntil(
        (async () => {
            const url = new URL(target, self.location.origin);

            /*
             * Focus an admin tab that is already open rather than opening a second one. An
             * administrator who clicks four notifications should end up with one window, not
             * four — and the open tab already holds their session and their scroll position.
             */
            const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            for (const client of clients) {
                if (new URL(client.url).origin !== url.origin) continue;
                await client.focus();
                if ("navigate" in client) await client.navigate(url.href);
                return;
            }

            await self.clients.openWindow(url.href);
        })()
    );
});

/*
 * Browsers rotate endpoints — after a long idle period, or when the push service rekeys. The
 * old endpoint stops working silently, and without this the administrator quietly stops being
 * notified while the UI still says "notifications are on".
 */
self.addEventListener("pushsubscriptionchange", (event) => {
    event.waitUntil(
        (async () => {
            const applicationServerKey =
                (event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey) ||
                null;
            if (!applicationServerKey) return;

            const fresh = await self.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fresh.toJSON()),
            });
        })()
    );
});
