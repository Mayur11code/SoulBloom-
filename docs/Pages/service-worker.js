// service-worker.js

// --- CONFIGURATION ---

// The cache name is versioned. When you update your app's shell files,
// you MUST increment this version number. This will trigger the 'activate'
// event and clear out the old, outdated cache, ensuring users get the latest version.
const CACHE_NAME = 'green-dashboard-cache-v1';

// This is the "App Shell" - the minimal set of files needed to get the UI on the screen.
// We cache these aggressively during the installation phase.
const APP_SHELL_URLS = [
  '/', // The root path
  'student_dasboard.html', // Your main HTML file
  'manifest.json', // The app manifest

  // Critical CSS & Fonts - without these, the app looks broken offline.
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=VT323&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',

  // Critical JavaScript Libraries
  'https://unpkg.com/lucide@latest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://accounts.google.com/gsi/client',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs',

  // Icons from the manifest, ensuring they are available offline.
  'https://placehold.co/192x192/48BB78/FFFFFF?text=G',
  'https://placehold.co/512x512/48BB78/FFFFFF?text=G',
  'https://placehold.co/96x96/805AD5/FFFFFF?text=J',
  'https://placehold.co/96x96/319795/FFFFFF?text=C'
];

// --- SERVICE WORKER LIFECYCLE ---

// Event: install
// This is the first event a service worker gets. It's triggered when the browser
// installs the service worker. We use this to pre-cache our app shell.
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  // waitUntil() ensures that the service worker will not install until the
  // code inside has successfully completed.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching App Shell');
        // addAll() fetches and caches all the URLs in the APP_SHELL_URLS array.
        // If any of the files fail to download, the entire install step will fail.
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

// Event: activate
// This event is fired after the service worker has been installed and the
// old service worker (if any) is gone. We use it to clean up old caches.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache's name is not our current CACHE_NAME, we delete it.
          // This is crucial for shipping updates.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // This claims all open clients (tabs) immediately, so the new service
  // worker can take control without waiting for a page reload.
  return self.clients.claim();
});


// --- FETCH EVENT HANDLING (The Core Logic) ---

// Event: fetch
// This event fires every time the app makes a network request (e.g., for an image, a script, an API call).
// We intercept this request and decide what to do with it.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests. Other requests (POST, etc.) should pass through.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For requests to external domains (like Firebase, Giphy), we go to the network first.
  // We don't want to cache dynamic API data here; Firebase handles its own offline persistence.
  const isExternal = new URL(event.request.url).hostname !== self.location.hostname;
  const isFirebase = new URL(event.request.url).hostname.includes('firebase');
  
  if (isExternal && !APP_SHELL_URLS.includes(event.request.url) || isFirebase) {
    // Let the browser handle the request as it normally would.
    return;
  }

  // This is our main strategy: "Cache, falling back to Network".
  // It provides the best offline experience.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      // 1. Try to find a match in the cache.
      return cache.match(event.request)
        .then(response => {
          // If a cached response is found, return it immediately. This is FAST.
          if (response) {
            return response;
          }

          // 2. If no match is found in the cache, fetch it from the network.
          return fetch(event.request).then(networkResponse => {
            // A request is a stream and can only be consumed once.
            // We need to clone it to put it in the cache and also send it to the browser.
            cache.put(event.request, networkResponse.clone());
            
            // Return the network response to the browser.
            return networkResponse;
          });
        }).catch(error => {
          // This catch handles cases where the fetch fails (e.g., user is offline).
          // You could return a custom offline fallback page here if you had one.
          console.error('[Service Worker] Fetch Error:', error);
        });
    })
  );
});
