import idb from 'idb';

/**
 * Common database helper functions.
 */
export default class DBHelper {
  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337;
    return `http://localhost:${port}`;
  }

  /**
   * IndexedDB database name.
   */
  static get DATABASE_NAME() {
    return 'restaurant-reviews';
  }

  /**
   * Restaurants store name.
   */
  static get RESTAURANTS_STORE_NAME() {
    return 'restaurants';
  }

  /**
   * Restaurant reviews store name.
   */
  static get REVIEWS_STORE_NAME() {
    return 'reviews';
  }

  /**
   * Restaurant reviews store name.
   */
  static get REVIEWS_STORE_INDEX() {
    return 'restaurant_id';
  }

  /**
   * Fetch all restaurants using cached data from IndexedDB first.
   */
  static async fetchRestaurants() {
    const db = await DBHelper.openIndexedDB();
    if (!db) {
      return DBHelper.fetchRestaurantsFromNetwork();
    }
    const restaurants = await db
      .transaction(DBHelper.RESTAURANTS_STORE_NAME)
      .objectStore(DBHelper.RESTAURANTS_STORE_NAME)
      .getAll();
    if (restaurants.length < 10) {
      return DBHelper.fetchRestaurantsFromNetwork();
    }
    return restaurants;
  }

  /**
   * Fetch all restaurants from network.
   */
  static async fetchRestaurantsFromNetwork() {
    const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants`);
    if (response.ok) {
      const [restaurants, db] = await Promise.all([response.json(), DBHelper.openIndexedDB()]);
      if (db) {
        const store = db
          .transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite')
          .objectStore(DBHelper.RESTAURANTS_STORE_NAME);
        for (const restaurant of restaurants) {
          store.put(restaurant);
        }
      }
      return restaurants;
    } else {
      throw new Error(`Failed fecthing all restaurants: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static async fetchRestaurantById(id) {
    const db = await DBHelper.openIndexedDB();
    if (!db) {
      return DBHelper.fetchRestaurantByIdFromNetwork(id);
    }
    const restaurant = await db
      .transaction(DBHelper.RESTAURANTS_STORE_NAME)
      .objectStore(DBHelper.RESTAURANTS_STORE_NAME)
      .get(id);
    if (!restaurant) {
      return DBHelper.fetchRestaurantByIdFromNetwork(id);
    }
    return restaurant;
  }

  /**
   * Fetch a restaurant by its ID from network.
   */
  static async fetchRestaurantByIdFromNetwork(id) {
    const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}`);
    if (response.ok) {
      const [restaurant, db] = await Promise.all([response.json(), DBHelper.openIndexedDB()]);
      if (db) {
        db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite')
          .objectStore(DBHelper.RESTAURANTS_STORE_NAME)
          .put(restaurant);
      }
      return restaurant;
    } else {
      throw new Error(`Failed fecthing restaurant by id ${id}: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Fetch a restaurant reviews by its ID.
   */
  static async fetchRestaurantReviewsById(id) {
    const db = await DBHelper.openIndexedDB();
    if (!db) {
      return DBHelper.fetchRestaurantReviewsByIdFromNetwork(id);
    }
    const reviews = await db
      .transaction(DBHelper.REVIEWS_STORE_NAME)
      .objectStore(DBHelper.REVIEWS_STORE_NAME)
      .index(DBHelper.REVIEWS_STORE_INDEX)
      .getAll(IDBKeyRange.only(id));
    if (!reviews || reviews.length === 0) {
      return DBHelper.fetchRestaurantReviewsByIdFromNetwork(id);
    }
    return reviews;
  }

  /**
   * Fetch a restaurant reviews by its ID from network.
   */
  static async fetchRestaurantReviewsByIdFromNetwork(id) {
    const response = await fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`);
    if (response.ok) {
      const [reviews, db] = await Promise.all([response.json(), DBHelper.openIndexedDB()]);
      if (db) {
        const store = db.transaction(DBHelper.REVIEWS_STORE_NAME, 'readwrite').objectStore(DBHelper.REVIEWS_STORE_NAME);
        for (const review of reviews) {
          store.put(review);
        }
      }
      return reviews;
    } else {
      throw new Error(
        `Failed fecthing restaurant reviews by restaurant id ${id}: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Set restaurant `is_favorite` property.
   */
  static async setResutaurantIsFavoriteProperty(id, isFavorite) {
    const response = await fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}/?is_favorite=${isFavorite}`, {
      method: 'PUT'
    });
    if (response.ok) {
      const [restaurant, db] = await Promise.all([response.json(), DBHelper.openIndexedDB()]);
      if (db) {
        db.transaction(DBHelper.RESTAURANTS_STORE_NAME, 'readwrite')
          .objectStore(DBHelper.RESTAURANTS_STORE_NAME)
          .put(restaurant);
      }
      return restaurant;
    } else {
      throw new Error(
        `Failed setting is_favorite property for restaurant ${id}: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Fetch restaurants by a cuisine type.
   */
  static async fetchRestaurantByCuisine(cuisine) {
    const restaurants = await DBHelper.fetchRestaurants();
    const results = restaurants.filter(r => r.cuisine_type === cuisine);
    return results;
  }

  /**
   * Fetch restaurants by a neighborhood.
   */
  static async fetchRestaurantByNeighborhood(neighborhood) {
    const restaurants = await DBHelper.fetchRestaurants();
    const results = restaurants.filter(r => r.neighborhood === neighborhood);
    return results;
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood.
   */
  static async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    const restaurants = await DBHelper.fetchRestaurants();
    let results = restaurants;
    // filter by cuisine
    if (cuisine !== 'all') {
      results = results.filter(r => r.cuisine_type === cuisine);
    }
    // filter by neighborhood
    if (neighborhood !== 'all') {
      results = results.filter(r => r.neighborhood === neighborhood);
    }
    return results;
  }

  /**
   * Fetch all neighborhoods.
   */
  static async fetchNeighborhoods() {
    const restaurants = await DBHelper.fetchRestaurants();
    // Get all neighborhoods from all restaurants
    const neighborhoods = restaurants.map(r => r.neighborhood);
    // Remove duplicates from neighborhoods
    const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
    return uniqueNeighborhoods;
  }

  /**
   * Fetch all cuisines.
   */
  static async fetchCuisines() {
    const restaurants = await DBHelper.fetchRestaurants();
    // Get all cuisines from all restaurants
    const cuisines = restaurants.map(r => r.cuisine_type);
    // Remove duplicates from cuisines
    const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
    return uniqueCuisines;
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return `/img/${restaurant.photograph}`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  /**
   * Open IndexedDB.
   */
  static openIndexedDB() {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    if (!DBHelper._db) {
      DBHelper._db = idb.open(DBHelper.DATABASE_NAME, 2, upgradeDb => {
        switch (upgradeDb.oldVersion) {
          case 0:
            upgradeDb.createObjectStore(DBHelper.DATABASE_NAME, {
              keyPath: 'id'
            });
          case 1:
            // Update initial restaurants store name
            const restaurantsStore = upgradeDb.transaction.objectStore(DBHelper.DATABASE_NAME);
            restaurantsStore.name = DBHelper.RESTAURANTS_STORE_NAME;
            // Create new object store for reviews
            const reviewsStore = upgradeDb.createObjectStore(DBHelper.REVIEWS_STORE_NAME, {
              keyPath: 'id'
            });
            reviewsStore.createIndex(DBHelper.REVIEWS_STORE_INDEX, DBHelper.REVIEWS_STORE_INDEX);
        }
      });
    }

    return DBHelper._db;
  }
}
