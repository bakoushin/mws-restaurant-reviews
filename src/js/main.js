import DBHelper from './dbhelper';
import LazyLoad from 'vanilla-lazyload';
import { GOOGLE_MAPS_KEY } from './constants';
import 'normalize.css';
import './../scss/main.scss';

let restaurants = [];
let neighborhoods = [];
let cuisines = [];

var map;
self.markers = [];

const lazyload = new LazyLoad({
  elements_selector: '.lazy'
});

/**
 * Fetch neighborhoods and cuisines, update restaurants as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  fetchNeighborhoods();
  fetchCuisines();
  updateRestaurants();
});

const loadStaticMap = () => {
  const mapContainer = document.getElementById('google-map');
  const width = mapContainer.offsetWidth;
  const height = mapContainer.offsetHeight;

  const scale = Math.round(window.devicePixelRatio);

  const loc = {
    lat: 40.722216,
    lng: -73.987501
  };

  const zoom = 12;

  const googleMapsUrl = 'https://maps.googleapis.com/maps/api/staticmap';

  const { lat, lng } = loc;

  const markers = self.restaurants
    .map(r => {
      const { lat, lng } = r.latlng;
      return `${lat},${lng}`;
    })
    .join('|');

  const url = `${googleMapsUrl}?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&scale=${scale}&key=${GOOGLE_MAPS_KEY}`;

  mapContainer.style.backgroundImage = `url(${url})`;

  window.setTimeout(() => {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBvdHH0g7-h0c1OT-azyIgm11IkSZUe3S8&callback=initMap';
    document.body.appendChild(script);
  }, 300);
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = async () => {
  try {
    self.neighborhoods = await DBHelper.fetchNeighborhoods();
  } catch (e) {
    console.error(e);
  }
  fillNeighborhoodsHTML();
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = async () => {
  try {
    self.cuisines = await DBHelper.fetchCuisines();
  } catch (e) {
    console.error(e);
  }
  fillCuisinesHTML();
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  const loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('google-map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  addMarkersToMap();
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = async () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  try {
    const restaurants = await DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood);
    resetRestaurants(restaurants);
  } catch (e) {
    console.error(e);
  }
  loadStaticMap();
  fillRestaurantsHTML();
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  lazyload.update();
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = restaurant => {
  const imgUrl = DBHelper.imageUrlForRestaurant(restaurant);
  const webpSrcset = `${imgUrl}.800w.webp 800w, ${imgUrl}.600w.webp 600w, ${imgUrl}.400w.webp 400w`;
  const jpgSrcset = `${imgUrl}.800w.jpg 800w, ${imgUrl}.600w.jpg 600w, ${imgUrl}.400w.jpg 400w`;
  const sizes = '(min-width: 975px) 33vw, (min-width: 660px) 50vw, 100vw';

  const li = document.createElement('li');

  const picture = document.createElement('picture');
  li.append(picture);

  const sourceWebp = document.createElement('source');
  sourceWebp.dataset.srcset = webpSrcset;
  sourceWebp.type = 'image/webp';
  sourceWebp.sizes = sizes;
  picture.append(sourceWebp);

  const sourceJpg = document.createElement('source');
  sourceJpg.dataset.srcset = jpgSrcset;
  sourceJpg.type = 'image/jpg';
  sourceJpg.sizes = sizes;
  picture.append(sourceJpg);

  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  image.dataset.src = `${imgUrl}.800w.jpg`;
  image.dataset.srcset = jpgSrcset;
  image.sizes = sizes;
  image.alt = `Cuisine: ${restaurant.cuisine_type}`;
  picture.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('address');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  if (!self.google) {
    return; // Google Maps aren't initialized yet.
  }
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};

/**
 * Service worker.
 */

const serviceWorkerUpdateReady = serviceWorker => {
  const notification = document.querySelector('.notification');
  const updateButton = notification.querySelector('.notification__button_type_update');
  const postponeButton = notification.querySelector('.notification__button_type_postpone');

  const focusedElementBeforeNotification = document.activeElement;
  const closeNotification = () => {
    notification.classList.remove('notification_visible');
    focusedElementBeforeNotification.focus();
  };

  notification.addEventListener('keydown', event => {
    const TAB = 9;
    const ESC = 27;
    if (event.keyCode === TAB) {
      if (event.shiftKey) {
        if (document.activeElement === updateButton) {
          event.preventDefault();
          postponeButton.focus();
        }
      } else {
        if (document.activeElement === postponeButton) {
          event.preventDefault();
          updateButton.focus();
        }
      }
    }
    if (event.keyCode === ESC) {
      closeNotification();
    }
  });

  notification.classList.add('notification_visible');
  updateButton.focus();

  updateButton.addEventListener('click', () => {
    if (serviceWorker.state === 'installed') {
      serviceWorker.postMessage({ action: 'skipWaiting' });
    }
  });

  postponeButton.addEventListener('click', closeNotification);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
};

const trackServiceWorkerInstalling = serviceWorker => {
  serviceWorker.addEventListener('statechange', () => {
    if (serviceWorker.state === 'installed') {
      serviceWorkerUpdateReady(serviceWorker);
    }
  });
};

const registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }

  window.addEventListener('load', async () => {
    const ONE_HOUR = 60 * 60 * 1000;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      setInterval(() => {
        reg.update();
      }, ONE_HOUR);

      if (!navigator.serviceWorker.controller) {
        return;
      }

      reg.addEventListener('updatefound', () => {
        trackServiceWorkerInstalling(reg.installing);
      });

      if (reg.installing) {
        trackServiceWorkerInstalling(reg.installing);
        return;
      }

      if (reg.waiting) {
        serviceWorkerUpdateReady(reg.waiting);
        return;
      }
    } catch (err) {
      console.error(err);
    }
  });
};

registerServiceWorker();
