// Service Worker for PWA Offline Functionality
// This service worker implements multiple caching strategies for optimal offline experience

// Cache names - versioned to allow for cache updates and cleanup
const CACHE_NAME = 'pwa-offline-v1';        // Main cache identifier (legacy)
const STATIC_CACHE = 'static-v1';           // Cache for static assets (HTML, CSS, JS, images)
const DYNAMIC_CACHE = 'dynamic-v1';         // Cache for dynamically requested resources
const API_CACHE = 'api-v1';                 // Cache for API responses

// Files to cache immediately (App Shell) - critical resources for offline functionality
const STATIC_ASSETS = [
    '/',                          // Root path (redirects to index.html)
    '/index.html',               // Main application page
    '/styles.css',               // Application styles
    '/app.js',                   // Main application JavaScript
    '/manifest.json',            // PWA manifest file
    '/icons/icon-192x192.png',   // PWA icon for home screen
    '/icons/icon-512x512.png',   // PWA icon for splash screen
    // Add offline fallback page
    '/offline.html'              // Custom offline page shown when navigation fails
];

// API endpoints to cache - external APIs that should be cached for offline access
const API_URLS = [
    'https://api.quotable.io/random'  // Random quote API endpoint
];

// Install Event - Cache static assets immediately when service worker is installed
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    // Wait for caching to complete before finishing installation
    event.waitUntil(
        caches.open(STATIC_CACHE)                    // Open the static cache
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);  // Cache all static assets at once
            })
            .then(() => {
                console.log('Service Worker: Static assets cached');
                return self.skipWaiting();           // Skip waiting phase, activate immediately
            })
            .catch((error) => {
                console.error('Service Worker: Error caching static assets', error);
            })
    );
});

// Activate Event - Clean up old caches and take control of all clients
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    // Wait for cleanup to complete before finishing activation
    event.waitUntil(
        caches.keys()                                // Get all cache names
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete any caches that aren't in our current cache list
                        if (cacheName !== STATIC_CACHE &&
                            cacheName !== DYNAMIC_CACHE &&
                            cacheName !== API_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);  // Remove outdated cache
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();          // Take control of all clients immediately
            })
    );
});

// Fetch Event - Implement different caching strategies based on request type
self.addEventListener('fetch', (event) => {
    const { request } = event;                    // Extract request from event
    const url = new URL(request.url);            // Parse URL for analysis

    // Only handle GET requests (POST, PUT, DELETE go through normally)
    if (request.method === 'GET') {
        if (isStaticAsset(request)) {
            // Cache First strategy for static assets (CSS, JS, images, icons)
            // Static assets rarely change, so serve from cache for speed
            event.respondWith(cacheFirst(request, STATIC_CACHE));
        } else if (isApiRequest(request)) {
            // Network First strategy for API calls
            // Try network first for fresh data, fall back to cache if offline
            event.respondWith(networkFirst(request, API_CACHE));
        } else if (isNavigationRequest(request)) {
            // Network First with offline fallback for page navigation
            // Try to load page from network, show offline page if failed
            event.respondWith(navigationHandler(request));
        } else {
            // Stale While Revalidate for other resources
            // Serve from cache immediately, update cache in background
            event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
        }
    }
});

// Background Sync Event - handle offline data synchronization
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered', event.tag);

    // Handle background sync when connectivity is restored
    if (event.tag === 'background-sync') {
        event.waitUntil(handleBackgroundSync());
    }
});

// Push Event - handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');

    // Configure notification options with rich content
    const options = {
        body: event.data ? event.data.text() : 'New update available!',  // Notification text
        icon: '/icons/icon-192x192.png',                                 // Large icon
        badge: '/icons/icon-72x72.png',                                  // Small badge icon
        vibrate: [200, 100, 200],                                       // Vibration pattern
        data: {
            dateOfArrival: Date.now(),                                   // Timestamp for tracking
            primaryKey: 1                                                // Unique identifier
        },
        actions: [                                                       // Action buttons
            {
                action: 'explore',
                title: 'Open App',
                icon: '/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/icon-192x192.png'
            }
        ]
    };

    // Show the notification to the user
    event.waitUntil(
        self.registration.showNotification('PWA Update', options)
    );
});

// Notification Click Event - handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');

    // Close the notification
    event.notification.close();

    // Handle different action buttons
    if (event.action === 'explore') {
        // Open the app when "Open App" is clicked
        event.waitUntil(
            clients.openWindow('/')
        );
    }
    // 'close' action doesn't need handling as notification is already closed
});

// Message Event - Communication channel between service worker and main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);

    // Handle skip waiting message from main thread
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();  // Skip waiting phase and activate immediately
    }
});

// Caching Strategies - Different approaches for different types of content

// Cache First Strategy - Optimal for static assets that rarely change
// Serves content from cache immediately, only fetches from network if not cached
async function cacheFirst(request, cacheName) {
    try {
        // Open the specified cache
        const cache = await caches.open(cacheName);
        // Check if request is already cached
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            // Serve from cache for instant loading
            console.log('Service Worker: Serving from cache', request.url);
            return cachedResponse;
        }

        // If not cached, fetch from network
        console.log('Service Worker: Fetching and caching', request.url);
        const networkResponse = await fetch(request);

        // Cache successful responses for future use
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Return error response if both cache and network fail
        console.error('Service Worker: Cache first failed', error);
        return new Response('Offline content not available', { status: 503 });
    }
}

// Network First Strategy - Optimal for API calls and dynamic content
// Tries network first for fresh data, falls back to cache if offline
async function networkFirst(request, cacheName) {
    try {
        // Always try network first for fresh data
        console.log('Service Worker: Trying network first', request.url);
        const networkResponse = await fetch(request);

        // Cache successful network responses
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());  // Clone because response can only be consumed once
            console.log('Service Worker: Network response cached', request.url);
        }

        return networkResponse;
    } catch (error) {
        // Network failed, try to serve from cache
        console.log('Service Worker: Network failed, trying cache', request.url);
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            console.log('Service Worker: Serving from cache', request.url);
            return cachedResponse;
        }

        // Both network and cache failed
        console.error('Service Worker: Network first failed completely', error);
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'No cached data available'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale While Revalidate Strategy - Good for frequently updated content
// Serves cached content immediately while updating cache in background
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Start network request in background (don't wait for it)
    const fetchPromise = fetch(request).then((networkResponse) => {
        // Update cache with fresh content if network succeeds
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);  // Fall back to cached response if network fails

    // Return cached response immediately if available, otherwise wait for network
    return cachedResponse || fetchPromise;
}

// Navigation Handler - Special handling for page navigation requests
// Ensures users always get a page, even when offline
async function navigationHandler(request) {
    try {
        // Try to load the requested page from network
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        // Network failed, serve offline fallback page
        console.log('Service Worker: Navigation offline, serving cached page');
        const cache = await caches.open(STATIC_CACHE);
        // Try offline page first, fall back to main page
        return cache.match('/offline.html') || cache.match('/index.html');
    }
}

// Background Sync Handler - processes queued data when connectivity returns
async function handleBackgroundSync() {
    console.log('Service Worker: Handling background sync');

    try {
        // In a real app, you would:
        // 1. Get pending sync items from IndexedDB or localStorage
        // 2. Retry failed network requests
        // 3. Update local data with server responses
        // 4. Clean up successfully synced items

        // Simulate sync operation (replace with actual sync logic)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Notify all open tabs/windows that sync completed
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',           // Message type for main thread
                payload: { success: true }       // Sync result data
            });
        });

        console.log('Service Worker: Background sync completed');
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Helper Functions - utilities for request classification and cache management

// Check if request is for a static asset (CSS, JS, images, etc.)
function isStaticAsset(request) {
    const url = new URL(request.url);
    return STATIC_ASSETS.some(asset => url.pathname === asset) ||  // Explicitly listed assets
           url.pathname.startsWith('/icons/') ||                   // Icon files
           url.pathname.endsWith('.css') ||                        // Stylesheets
           url.pathname.endsWith('.js') ||                         // JavaScript files
           url.pathname.endsWith('.png') ||                        // PNG images
           url.pathname.endsWith('.jpg') ||                        // JPEG images
           url.pathname.endsWith('.svg');                          // SVG images
}

// Check if request is for an API endpoint
function isApiRequest(request) {
    const url = new URL(request.url);
    return API_URLS.some(apiUrl => request.url.startsWith(apiUrl)) ||  // Known API URLs
           url.pathname.startsWith('/api/');                           // Local API endpoints
}

// Check if request is for page navigation (HTML pages)
function isNavigationRequest(request) {
    return request.mode === 'navigate' ||                              // Browser navigation
           (request.method === 'GET' &&                               // GET request
            request.headers.get('accept') &&                          // Has accept header
            request.headers.get('accept').includes('text/html'));     // Accepts HTML
}

// Cache size management - prevent caches from growing too large
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();                    // Get all cached items

    if (keys.length > maxItems) {
        // Remove oldest items (FIFO - First In, First Out)
        const itemsToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(itemsToDelete.map(key => cache.delete(key)));
        console.log(`Service Worker: Cleaned ${itemsToDelete.length} items from ${cacheName}`);
    }
}

// Periodic cache cleanup - runs automatically to maintain cache size limits
setInterval(() => {
    limitCacheSize(DYNAMIC_CACHE, 50);    // Keep max 50 dynamic resources
    limitCacheSize(API_CACHE, 20);        // Keep max 20 API responses
}, 60000); // Clean every minute (60,000 milliseconds)
