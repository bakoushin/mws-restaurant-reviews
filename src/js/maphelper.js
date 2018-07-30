import DBHelper from './dbhelper';
import { DEFAULT_LOCATION, GOOGLE_MAPS_KEY } from './constants';

export default class MapHelper {
  /**
   * Google Static Map URL.
   */
  static get STATIC_MAP_URL() {
    return 'https://maps.googleapis.com/maps/api/staticmap';
  }

  /**
   * Interactive map URL.
   */
  static get INTERACTIVE_MAP_URL() {
    return 'https://maps.googleapis.com/maps/api/js';
  }

  /**
   * DOM element containing the map.
   */
  static get mapContainer() {
    return document.getElementById('google-map');
  }

  /**
   * Load staic map first, then load interactive map.
   */
  static loadMap() {
    const mapContainer = MapHelper.mapContainer;

    const width = mapContainer.offsetWidth;
    const height = mapContainer.offsetHeight;
    const scale = Math.round(window.devicePixelRatio);
    const zoom = 12;
    const { lat, lng } = DEFAULT_LOCATION;

    const url = `${
      MapHelper.STATIC_MAP_URL
    }?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&scale=${scale}&key=${GOOGLE_MAPS_KEY}`;

    mapContainer.style.backgroundImage = `url(${url})`;
    mapContainer.classList.add('map__google-map--blurry');

    MapHelper.loadInteractiveMap();
  }

  /**
   * Load interactive Google map.
   */
  static async loadInteractiveMap() {
    const script = document.createElement('script');
    script.src = `${MapHelper.INTERACTIVE_MAP_URL}?callback=initInteractiveMap&key=${GOOGLE_MAPS_KEY}`;
    document.body.appendChild(script);
  }

  /**
   * Remove blur from the map.
   */
  static removeMapBlur() {
    const mapContainer = MapHelper.mapContainer;
    mapContainer.classList.remove('map__google-map--blurry');
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
}
