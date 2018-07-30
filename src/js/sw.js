import DBHelper from './dbhelper';

const VERSION = 3;
const APP_PREFIX = 'restaurant-reviews';
const STATIC_CACHE = `${APP_PREFIX}-static-v${VERSION}`;
const IMAGES_CACHE = `${APP_PREFIX}-img`;
const allCaches = [STATIC_CACHE, IMAGES_CACHE];

/**
 * Event listeners.
 */

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(buildStaticCache());
});

self.addEventListener('activate', event => {
  event.waitUntil(removeRedundantCaches());
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
    case 'sync-favorites':
      event.waitUntil(syncFavorites());
      break;
    case 'sync-reviews':
      event.waitUntil(syncReviews());
      break;
    default:
      event.registration.unregister();
  }
});

/**
 * Helper functions.
 */

const buildStaticCache = async () => {
  const dynamicAssets = serviceWorkerOption
    ? serviceWorkerOption.assets
    : ['/', '/main.css', '/main.js', '/restaurant.html', '/restaurant_info.css', '/restaurant_info.js'];

  const staticAssets = [
    '/assets/placeholder-image.400w.jpg',
    '/assets/placeholder-image.400w.webp',
    '/assets/placeholder-image.600w.jpg',
    '/assets/placeholder-image.600w.webp',
    '/assets/placeholder-image.800w.jpg',
    '/assets/placeholder-image.800w.webp'
  ];

  const cache = await caches.open(STATIC_CACHE);
  return cache.addAll([...dynamicAssets, ...staticAssets]);
};

const removeRedundantCaches = async () => {
  const keys = await caches.keys();
  return Promise.all(
    keys.filter(key => key.startsWith(APP_PREFIX) && !allCaches.includes(key)).map(key => caches.delete(key))
  );
}

const servePhoto = async request => {
  const url = new URL(request.url);
  const [filename, size, extension] = url.pathname.replace('/img/', '').split('.');

  const imagesCache = await caches.open(IMAGES_CACHE);
  const cachedResponse = await imagesCache.match(filename);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    imagesCache.put(filename, networkResponse.clone());
    return networkResponse;
  } else {
    const staticCache = await caches.open(STATIC_CACHE);
    return staticCache.match(`/assets/placeholder-image.${size}.${extension}`);
  }
};

const serveRestaurantInfo = async () => {
  const cache = await caches.open(STATIC_CACHE);
  return cache.match('restaurant.html');
};

const syncFavorites = async () => {
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
        action: 'favorites-synced',
        id: restaurant.id
      })
    );
  }
};

const syncReviews = async () => {
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
        action: 'reviews-synced',
        restaurant_id: review.restaurant_id,
        id: review.id
      })
    );
  }
};
