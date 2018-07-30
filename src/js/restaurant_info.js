import DBHelper from './dbhelper';
import 'normalize.css';
import './../scss/restaurant.scss';

const RESPONSE_TRESHOLD = 80; // Maximum waiting time for network response before showing spinners etc.

let restaurant;
let reviews = [];
let reviewsInOutbox = [];

var map;

const favoriteButton = document.querySelector('.restaurant-favorite-button');
const favoriteIcon = document.querySelector('.restaurant-favorite-icon');
const reviewForm = document.querySelector('.review-form');
const submitReviewButton = document.querySelector('.submit-review-button');

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
    switch (data.action) {
      case 'favorites-synced':
        if (data.id === self.restaurant.id) {
          self.restaurant = await DBHelper.fetchRestaurantById(data.id);
          self.restaurantFavoriteIsUpdating = Boolean(await DBHelper.getFavoriteFromOutboxById(data.id));
          if (self.restaurantFavoriteStartedUpdate) {
            self.restaurantFavoriteStartedUpdate = self.restaurantFavoriteIsUpdating;
          }
          fillFavoriteHTML();
        }
        break;
      case 'reviews-synced':
        if (data.restaurant_id === self.restaurant.id) {
          fetchRestaurantReviewsById(data.restaurant_id);
        }
        break;
    }
  });
}

favoriteButton.addEventListener('mousedown', () => {
  favoriteButton.classList.add('outline-hidden');
});

favoriteButton.addEventListener('keydown', () => {
  favoriteButton.classList.remove('outline-hidden');
});

favoriteButton.addEventListener('blur', () => {
  favoriteButton.classList.remove('outline-hidden');
});

favoriteButton.addEventListener('click', event => {
  const pressed = event.target.getAttribute('aria-pressed') === 'true';
  event.target.setAttribute('aria-pressed', !pressed);

  toggleFavorite();
});

submitReviewButton.addEventListener('click', event => {
  event.preventDefault();
  postReview();
});

const postReview = async (restaurant = self.restaurant) => {
  const rating = Number(reviewForm['rating'].value);
  const name = reviewForm['name'].value;
  const comments = reviewForm['comments'].value;

  const timestamp = Date.now();
  const review = {
    createdAt: timestamp,
    updatedAt: timestamp,
    restaurant_id: restaurant.id,
    name,
    rating,
    comments
  };

  self.reviewsInOutbox.push(review);
  fillReviewsHTML();

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await DBHelper.addReviewToOutbox(review);
    try {
      await registration.sync.register('sync-reviews');
      reviewForm.reset();
    } catch (e) {
      console.error(e);
      postReviewDirectly(review);
    }
  } else {
    postReviewDirectly(review);
  }
};

const postReviewDirectly = async review => {
  try {
    await DBHelper.postResaurantReview(review);
    reviewForm.reset();
  } catch (e) {
    console.error(e);
  }
  fillReviewsHTML();
};

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

    self.restaurantFavoriteIsUpdating = Boolean(await DBHelper.getFavoriteFromOutboxById(id));

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
    fetchRestaurantReviewsById(id);
  }
};

/**
 * Get restaurant reviews by restaurant id.
 */
const fetchRestaurantReviewsById = async id => {
  const [reviews, reviewsInOutbox] = await Promise.all([
    DBHelper.fetchRestaurantReviewsById(id),
    DBHelper.getReviewsFromOutboxByRestaurantId(id)
  ]);
  self.reviews = reviews || [];
  self.reviewsInOutbox = reviewsInOutbox || [];
  fillReviewsHTML();
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.reviews, reviewsInOutbox = self.reviewsInOutbox) => {
  const container = document.getElementById('reviews-container');

  if (!reviews || reviews.length === 0) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet. Let your be first!';
    container.appendChild(noReviews);
    return;
  }

  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  if (reviewsInOutbox && reviewsInOutbox.length > 0) {
    reviewsInOutbox.forEach(review => {
      ul.appendChild(createReviewHTML(review, true));
    });
  }
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review, reviewIsPending = false) => {
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

  if (reviewIsPending) {
    const info = document.createElement('p');
    info.textContent = 'Sending to server';
    li.appendChild(info);
  }

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
  self.restaurantFavoriteStartedUpdate = true;

  // If favorite wouldn't be updated in RESPONSE_TRESHOLD, animation will start
  window.setTimeout(() => {
    if (self.restaurantFavoriteStartedUpdate) {
      self.restaurantFavoriteStartedUpdate = false;
      self.restaurantFavoriteIsUpdating = true;
      fillFavoriteHTML();
    }
  }, RESPONSE_TRESHOLD);

  const newFavoriteState = restaurant.is_favorite === 'true' ? 'false' : 'true';
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await DBHelper.addFavoriteToOutbox(restaurant.id, newFavoriteState);
    try {
      await registration.sync.register('sync-favorites');
    } catch (e) {
      console.error(e);
      toggleFavoriteDirectly(newFavoriteState);
    }
  } else {
    toggleFavoriteDirectly(newFavoriteState);
  }
};

const toggleFavoriteDirectly = async newFavoriteState => {
  try {
    self.restaurant = await DBHelper.setResutaurantIsFavoriteProperty(self.restaurant.id, newFavoriteState);
  } catch (e) {
    console.error(e);
  }
  self.restaurantFavoriteStartedUpdate = false;
  self.restaurantFavoriteIsUpdating = false;
  fillFavoriteHTML();
};

/**
 * Render favorite toggle.
 */
const fillFavoriteHTML = (restaurant = self.restaurant) => {
  const isFavoriteStyle = 'restaurant-favorite-icon--is-favorite';
  const animateFlipStyle = 'restaurant-favorite-icon--animate-flip';
  if (self.restaurantFavoriteIsUpdating) {
    favoriteIcon.classList.add(animateFlipStyle);
  } else {
    favoriteIcon.classList.remove(animateFlipStyle);
    if (restaurant.is_favorite === 'true') {
      favoriteIcon.classList.add(isFavoriteStyle);
      favoriteButton.setAttribute('aria-pressed', true);
    } else {
      favoriteIcon.classList.remove(isFavoriteStyle);
      favoriteButton.setAttribute('aria-pressed', false);
    }
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
