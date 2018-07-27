import DBHelper from './dbhelper';
import 'normalize.css';
import './../scss/restaurant.scss';

let restaurant;
let reviews;

var map;

const markRestaurantOnMap = () => {
  self.map = new google.maps.Map(document.getElementById('google-map'), {
    zoom: 16,
    center: self.restaurant.latlng,
    scrollwheel: false
  });
  DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
};

const fetchRestaurant = async () => {
  if (!self.restaurant && !self.resaurantIsFetching) {
    try {
      await fetchRestaurantFromURL();
      if (!self.map && self.google) {
        markRestaurantOnMap();
      }
      fillBreadcrumb();
      fetchRestaurantReviewsFromURL();
    } catch (e) {
      console.error(e);
    }
  }
};

document.addEventListener('DOMContentLoaded', fetchRestaurant);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async ({ data }) => {
    if (data.action === 'favorites-updated') {
      const isFavoriteUpdating = await DBHelper.getFavoriteFromOutboxById(data.id);
      if (!isFavoriteUpdating) {
        self.restaurant.is_favorite_updating = false;
      }
      fillFavoriteHTML();
    }
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  if (self.restaurant) {
    markRestaurantOnMap();
  } else {
    fetchRestaurant();
  }
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = async () => {
  if (self.restaurant) {
    // restaurant already fetched!
    return self.restaurant;
  }
  const id = Number(getParameterByName('id'));
  if (!id) {
    // no id found in URL
    throw new Error('No restaurant id in URL');
  } else {
    self.resaurantIsFetching = true;
    const restaurant = await DBHelper.fetchRestaurantById(id);
    self.resaurantIsFetching = false;
    self.restaurant = restaurant;
    fillRestaurantHTML();
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const imgUrl = DBHelper.imageUrlForRestaurant(restaurant);
  const webpSrcset = `${imgUrl}.800w.webp 800w, ${imgUrl}.600w.webp 600w, ${imgUrl}.400w.webp 400w`;
  const jpgSrcset = `${imgUrl}.800w.jpg 800w, ${imgUrl}.600w.jpg 600w, ${imgUrl}.400w.jpg 400w`;
  const sizes = '(min-width: 1100px) 50vw, 100vw';

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-picture');

  const sourceWebp = document.createElement('source');
  sourceWebp.srcset = webpSrcset;
  sourceWebp.type = 'image/webp';
  sourceWebp.sizes = sizes;
  picture.append(sourceWebp);

  const sourceJpg = document.createElement('source');
  sourceJpg.srcset = jpgSrcset;
  sourceJpg.type = 'image/jpg';
  sourceJpg.sizes = sizes;
  picture.append(sourceJpg);

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = `${imgUrl}.800w.jpg`;
  image.srcset = jpgSrcset;
  image.sizes = sizes;
  image.alt = `Cuisine: ${restaurant.cuisine_type}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  if (restaurant.reviews) {
    fillReviewsHTML();
  }
  // render favorite toggle
  if (Object.prototype.hasOwnProperty.call(restaurant, 'is_favorite')) {
    fillFavoriteHTML();
  }
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Get current restaurant reviews from page URL.
 */
const fetchRestaurantReviewsFromURL = async () => {
  if (self.restaurant.reviews) {
    // reviews already fetched!
    return self.restaurant.reviews;
  }
  const id = Number(getParameterByName('id'));
  if (!id) {
    // no id found in URL
    throw new Error('No restaurant id in URL');
  } else {
    const reviews = await DBHelper.fetchRestaurantReviewsById(id);
    self.restaurant.reviews = reviews;
    fillReviewsHTML();
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews || reviews.length === 0) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = review => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Toggle favorite property.
 */
const toggleFavorite = async (restaurant = self.restaurant) => {
  if (!restaurant) {
    return;
  }
  const prevValue = restaurant.is_favorite;
  restaurant.is_favorite = restaurant.is_favorite === 'true' ? 'false' : 'true';
  restaurant.is_favorite_updating = true;
  fillFavoriteHTML();
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await DBHelper.addFavoriteToOutbox(restaurant.id, restaurant.is_favorite);
    try {
      await registration.sync.register('update-favorites');
    } catch (e) {
      console.error(e);
      await toggleFavoriteDirectly(restaurant.id, restaurant.is_favorite, prevValue);
      fillFavoriteHTML();
    }
  } else {
    await toggleFavoriteDirectly(restaurant.id, restaurant.is_favorite, prevValue);
    fillFavoriteHTML();
  }
};

const toggleFavoriteDirectly = async (id, isFavorite, prevValue) => {
  try {
    self.restaurant = await DBHelper.setResutaurantIsFavoriteProperty(id, isFavorite);
  } catch (e) {
    console.error(e);
    restaurant.is_favorite = prevValue;
    restaurant.is_favorite_updating = false;
  }
};

/**
 * Render favorite toggle.
 */
const fillFavoriteHTML = (restaurant = self.restaurant) => {
  const favorite = document.getElementById('favorite');
  favorite.innerHTML = '';

  const toggleButton = document.createElement('button');
  toggleButton.textContent = restaurant.is_favorite;
  toggleButton.addEventListener('click', () => toggleFavorite());
  favorite.appendChild(toggleButton);

  if (restaurant.is_favorite_updating) {
    const updatingStatus = document.createElement('span');
    updatingStatus.textContent = 'Updating...';
    favorite.appendChild(updatingStatus);
  }
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
