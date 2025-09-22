// FlertaAI Service Worker
// Cache static assets, offline fallback, no private data caching

const CACHE_NAME = 'flertaai-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('FlertaAI: Cache opened');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('FlertaAI: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('FlertaAI: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('FlertaAI: Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - Cache first for static, network first for API
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip Supabase API calls (always fresh, contains private data)
  if (event.request.url.includes('supabase') || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('auth')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache static assets only
            if (event.request.url.includes('.css') ||
                event.request.url.includes('.js') ||
                event.request.url.includes('.png') ||
                event.request.url.includes('.jpg') ||
                event.request.url.includes('.svg') ||
                event.request.url.includes('.woff')) {
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // Offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Background sync for failed requests (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('FlertaAI: Background sync triggered');
    // Handle background sync for failed API calls
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'flertaai-notification',
      requireInteraction: false,
      silent: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/app')
  );
});
