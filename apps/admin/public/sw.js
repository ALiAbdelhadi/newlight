self.addEventListener("install", (event) => {
    console.log("Service Worker installing");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activating");
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    if (!event.data) {
        console.log("Push event but no data");
        return;
    }

    const data = event.data.json();
    const { title, body, icon, badge, data: actionData } = data;

    const options = {
        body,
        icon: icon || "/icon-192x192.png",
        badge: badge || "/badge-72x72.png",
        vibrate: [200, 100, 200],
        tag: actionData?.contactFormId || actionData?.orderId || "notification",
        data: actionData,
        actions: [
            {
                action: "open",
                title: "Open",
            },
            {
                action: "close",
                title: "Close",
            },
        ],
        requireInteraction: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "close") {
        return;
    }

    const urlToOpen = event.notification.data?.url || "/admin/dashboard";

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && "focus" in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow(urlToOpen);
                }
            })
    );
});