self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
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
            self.clients
                .matchAll({ type: "window", includeUncontrolled: true })
                .then((clients) => clients.forEach((client) => client.postMessage({ type: "notification" }))),

            self.registration.showNotification(title, {
                body: payload.body || "",
                icon: "/web-app-manifest-192x192.png",
                badge: "/favicon-96x96.png",
                tag: payload.notificationId || payload.type || "newlight",
                renotify: true,
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
