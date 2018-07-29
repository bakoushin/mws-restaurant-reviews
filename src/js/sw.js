import DBHelper from './dbhelper';

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
  const assets = ['/', '/main.css', '/main.js', '/restaurant.html', '/restaurant_info.css', '/restaurant_info.js'];
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(serviceWorkerOption ? serviceWorkerOption.assets : assets);
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

self.addEventListener('sync', event => {
  switch (event.tag) {
    case 'update-favorites':
      event.waitUntil(updateFavorites());
      break;
    case 'update-reviews':
      event.waitUntil(updateReviews());
      break;
    default:
      event.registration.unregister();
  }
});

async function updateFavorites() {
  let restaurant;
  while ((restaurant = await DBHelper.getNextFavoriteFromOutbox())) {
    try {
      await DBHelper.setResutaurantIsFavoriteProperty(restaurant.id, restaurant.isFavorite);
    } catch (e) {
      console.error(e);
      throw e;
    }
    await DBHelper.deleteFavoriteFromOutbox(restaurant.id);
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(c =>
      c.postMessage({
        action: 'favorites-updated',
        id: restaurant.id
      })
    );
  }
}

async function updateReviews() {
  let review;
  while ((review = await DBHelper.getNextReviewFromOutbox())) {
    try {
      await DBHelper.postResaurantReview(review);
    } catch (e) {
      console.error(e);
      throw e;
    }
    await DBHelper.deleteReviewFromOutbox(review.restaurant_id);
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(c =>
      c.postMessage({
        action: 'reviews-updated',
        restaurant_id: review.restaurant_id,
        id: review.id
      })
    );
  }
}

/**
 * Helper functions.
 */

async function servePhoto(request) {
  const url = new URL(request.url);
  const filename = url.pathname.replace('/img/', '').split('.')[0];

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
