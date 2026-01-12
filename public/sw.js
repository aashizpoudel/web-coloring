const CACHE_NAME = 'vibe-coloring-v1';

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate event - clean up old caches etc
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Fetch event - Network first, then cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // dynamic caching
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    // For external resources or non-ok responses, just return
                    return response;
                }

                // Clone the response because it's a stream
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        // Don't cache POST requests or non-http
                        if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
                            cache.put(event.request, responseToCache);
                        }
                    });

                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request);
            })
    );
});
