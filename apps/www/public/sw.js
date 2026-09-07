// Placeholder service worker for local development.
//
// In production builds next-pwa (Workbox) overwrites this file with the
// generated offline-caching worker. Push handlers were removed with the
// web-push channel; admin notification is handled by transactional email.

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});
