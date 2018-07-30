import LazyLoad from 'vanilla-lazyload';
import DBHelper from './dbhelper';
import MapHelper from './maphelper';
import { DEFAULT_LOCATION } from './constants';
import './service_worker';
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

/**
 * Initialize Google map, called from HTML.
 */
window.initInteractiveMap = () => {
  self.map = new google.maps.Map(document.getElementById('google-map'), {
    zoom: 12,
    center: DEFAULT_LOCATION,
    scrollwheel: false
  });
  MapHelper.removeMapBlur();
  addMarkersToMap();
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

  MapHelper.loadMap();
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
    const marker = MapHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
