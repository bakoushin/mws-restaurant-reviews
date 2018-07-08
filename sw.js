const VERSION = 3;
const APP_PREFIX = 'restaurant-reviews';
const STATIC_CACHE = `${APP_PREFIX}-static-v${VERSION}`;
const IMAGES_CACHE = `${APP_PREFIX}-img`;
const allCaches = [STATIC_CACHE, IMAGES_CACHE];

/**
 * Service worker event listeners.
 */

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll([
        '/',
        '/css/styles.css',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/js/dbhelper.js',
        '/restaurant.html'
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith(APP_PREFIX) && !allCaches.includes(key)).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  if (url.pathname.startsWith('/img/')) {
    event.respondWith(servePhoto(event.request));
    return;
  }

  if (url.pathname.startsWith('/restaurant.html')) {
    event.respondWith(serveRestaurantInfo());
    return;
  }

  event.respondWith(
    caches.match(event.request.url).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});

/**
 * Helper functions.
 */

async function servePhoto(request) {
  const url = new URL(request.url);
  const filename = url.pathname.replace('/img/', '');

  const cache = await caches.open(IMAGES_CACHE);
  const cachedResponse = await cache.match(filename);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  cache.put(filename, networkResponse.clone());
  return networkResponse;
}

async function serveRestaurantInfo() {
  const cache = await caches.open(STATIC_CACHE);
  return cache.match('restaurant.html');
}
