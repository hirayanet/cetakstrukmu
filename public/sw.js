// Service Worker untuk PWA Cetak Struk Transfer
const CACHE_NAME = 'cetak-struk-v1.0.1';
const STATIC_CACHE_NAME = 'cetak-struk-static-v1.0.1';
const DYNAMIC_CACHE_NAME = 'cetak-struk-dynamic-v1.0.1';

// Files yang akan di-cache untuk offline access
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS dan JS akan di-cache secara dinamis
];

// Files yang penting untuk functionality
const CORE_ASSETS = [
  '/',
  '/index.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Notify clients about update
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATE_AVAILABLE',
              version: CACHE_NAME
            });
          });
        });
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('cetak-struk-')) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Notify clients about successful update
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATE_ACTIVATED',
              version: CACHE_NAME
            });
          });
        });
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (APIs, CDNs, etc)
  if (!url.origin.includes(self.location.origin) &&
    !url.hostname.includes('localhost') &&
    !url.hostname.includes('vercel.app')) {
    return;
  }

  // STRATEGY: Network First for HTML (Navigation)
  // Ini memastikan user selalu dapat versi terbaru saat online
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Check if valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Update cache with new version
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return networkResponse;
        })
        .catch(() => {
          // If offline, fallback to cache
          console.log('OFFLINE: Serving cached index.html');
          return caches.match('/index.html');
        })
    );
    return;
  }

  // STRATEGY: Cache First for Assets (JS, CSS, Images)
  // Karena file build Vite menggunakan hash (contoh: main.x8s7.js), aman di-cache selamanya
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return networkResponse;
          });
      })
  );
});

// Background sync for future enhancement
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync', event.tag);

  if (event.tag === 'background-sync-mapping') {
    event.waitUntil(
      // Could sync account mappings to server
      console.log('📊 Service Worker: Syncing account mappings')
    );
  }
});

// Push notifications for future enhancement
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'Ada update baru untuk aplikasi cetak struk!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Buka Aplikasi',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Tutup',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Cetak Struk Transfer', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🎯 Service Worker: Loaded successfully');
