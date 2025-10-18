const CACHE_NAME = 'soul-bloom-cache-v2'; // Cache version has been updated
const urlsToCache = [
    '.', // Cache the root (index.html)
    'student_dasboard.html', // Caching the new student page
    'mentor_dasboard.html',  // Caching the new mentor page
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=Playfair+Display:wght@700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    // Main App Icons
    'https://placehold.co/192x192/a7f3d0/14532d?text=SB',
    'https://placehold.co/512x512/a7f3d0/14532d?text=Soul%0ABloom',
    // Shortcut Icons
    'https://placehold.co/96x96/805AD5/FFFFFF?text=J',
    'https://placehold.co/96x96/319795/FFFFFF?text=C',
    // Screenshots
    'https://placehold.co/1080x1920/0F2923/FFFFFF?text=Replace+with+Screenshot+1',
    'https://placehold.co/1080x1920/0F2923/FFFFFF?text=Replace+with+Screenshot+2',
    'https://placehold.co/1280x800/0F2923/FFFFFF?text=Replace+with+Desktop+Screenshot',
    'https://placehold.co/600x400/a7f3d0/14532d?text=Soul+Bloom+Community'
];

// Install the service worker and cache the static assets
self.addEventListener('install', event => {
    self.skipWaiting(); // Force the new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching new files');
                // Use { cache: 'reload' } to ensure we get the latest from the network on install
                const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests);
            })
    );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return from cache
                }
                return fetch(event.request).then(
                    response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                ).catch(err => {
                    console.log('Fetch failed.', err);
                    // You can optionally return an offline fallback page here if you have one cached
                });
            })
    );
});

// Clean up old caches on activation
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

