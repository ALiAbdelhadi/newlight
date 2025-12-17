// Service Worker for Admin App
self.addEventListener('install', function(event) {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating...');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
    // Basic fetch handler - next-pwa will handle caching
    event.respondWith(fetch(event.request));
});

