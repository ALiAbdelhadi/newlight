const CACHE_NAME = "art-lighting-v1";
const OFFLINE_URL = "/offline";

const STATIC_ASSETS = [
    "/en",
    "/ar",
    "/en/offline",
    "/ar/offline",
    "/favicon.ico",
];

// Install Event - مع error handling محكم
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // استخدم Promise.allSettled بدلاً من addAll
            // هذا يمنع فشل التثبيت بسبب ملف واحد مفقود
            return Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn(`Failed to cache: ${url}`, err);
                        return null;
                    })
                )
            );
        }).catch(err => {
            console.error('Service Worker installation failed:', err);
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Network First Strategy مع تحسينات
self.addEventListener("fetch", (event) => {
    // تجاهل non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // تجاهل chrome extensions و analytics
    if (event.request.url.startsWith('chrome-extension://') ||
        event.request.url.includes('analytics') ||
        event.request.url.includes('gtag')) {
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // استخرج اللغة من الـ URL
                    const url = new URL(event.request.url);
                    const locale = url.pathname.startsWith('/ar') ? 'ar' : 'en';
                    return caches.match(`/${locale}/offline`);
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            return fetch(event.request).then((response) => {
                // تحقق من صلاحية الاستجابة
                if (!response ||
                    response.status !== 200 ||
                    response.type !== "basic") {
                    return response;
                }

                // لا تخزن API responses أو authentication requests
                if (event.request.url.includes('/api/') ||
                    event.request.url.includes('/auth/')) {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                }).catch(err => {
                    console.warn('Failed to cache request:', event.request.url);
                });

                return response;
            }).catch(err => {
                console.warn('Fetch failed for:', event.request.url);
                // Return offline fallback for navigations مع دعم اللغات
                if (event.request.mode === 'navigate') {
                    const url = new URL(event.request.url);
                    const locale = url.pathname.startsWith('/ar') ? 'ar' : 'en';
                    return caches.match(`/${locale}/offline`);
                }
                throw err;
            });
        })
    );
});