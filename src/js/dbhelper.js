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
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * IndexedDB database name.
   */
  static get DATABASE_NAME() {
    return 'restaurant-reviews';
  }

  /**
   * Fetch all restaurants using cached data from IndexedDB first.
   */
  static fetchRestaurants(callback) {
    DBHelper.openIndexedDB().then(db => {
      if (!db) {
        DBHelper.fetchRestaurantsFromNetwork(callback);
      }
      const store = db.transaction(DBHelper.DATABASE_NAME).objectStore(DBHelper.DATABASE_NAME);
      store.getAll().then(restaurants => {
        if (restaurants.length < 10) {
          DBHelper.fetchRestaurantsFromNetwork(callback);
        }
        callback(null, restaurants);
      });
    });
  }

  /**
   * Fetch all restaurants from network.
   */
  static fetchRestaurantsFromNetwork(callback) {
    fetch(DBHelper.DATABASE_URL)
      .then(response => {
        if (response.ok) {
          return response.json().then(restaurants => {
            DBHelper.openIndexedDB().then(db => {
              if (!db) return;
              const store = db.transaction(DBHelper.DATABASE_NAME, 'readwrite').objectStore(DBHelper.DATABASE_NAME);
              for (const restaurant of restaurants) {
                store.put(restaurant);
              }
            });
            return restaurants;
          });
        } else {
          callback(error, null);
        }
      })
      .then(restaurants => {
        callback(null, restaurants);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.openIndexedDB().then(db => {
      if (!db) {
        DBHelper.fetchRestaurantByIdFromNetwork(id, callback);
      }
      db.transaction(DBHelper.DATABASE_NAME)
        .objectStore(DBHelper.DATABASE_NAME)
        .get(id)
        .then(restaurant => {
          if (!restaurant) {
            DBHelper.fetchRestaurantByIdFromNetwork(id, callback);
          }
          callback(null, restaurant);
        });
    });
  }

  /**
   * Fetch a restaurant by its ID from network.
   */
  static fetchRestaurantByIdFromNetwork(id, callback) {
    fetch(`${DBHelper.DATABASE_URL}/${id}`)
      .then(response => {
        if (response.ok) {
          return response.json().then(restaurant => {
            DBHelper.openIndexedDB().then(db => {
              if (!db) return;
              const store = db.transaction(DBHelper.DATABASE_NAME, 'readwrite').objectStore(DBHelper.DATABASE_NAME);
              store.put(restaurant);
            });
            return restaurant;
          });
        } else {
          callback(error, null);
        }
      })
      .then(restaurant => {
        callback(null, restaurant);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
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
      DBHelper._db = idb.open(this.DATABASE_NAME, 1, upgradeDb => {
        const store = upgradeDb.createObjectStore(this.DATABASE_NAME, {
          keyPath: 'id'
        });
      });
    }

    return DBHelper._db;
  }
}
