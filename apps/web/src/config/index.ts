/**
 * Centralized configuration for the web application
 * All environment-specific values are loaded from here
 */

// API Configuration
export const API_CONFIG = {
  /** Base URL for API requests */
  BASE_URL: import.meta.env.VITE_API_URL || '/api',
}

// Geocoding Configuration
export const GEOCODING_CONFIG = {
  /** Nominatim API base URL */
  NOMINATIM_URL: import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  /** User agent for Nominatim requests (required by their ToS) */
  USER_AGENT: import.meta.env.VITE_APP_USER_AGENT || 'EV-Overlay/1.0',
}

// Map Configuration
export const MAP_CONFIG = {
  /** OpenStreetMap tile layer URL */
  TILE_LAYER_URL:
    import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Tile layer attribution */
  ATTRIBUTION: import.meta.env.VITE_MAP_ATTRIBUTION || '© OpenStreetMap contributors',
  /** Maximum zoom level */
  MAX_ZOOM: parseInt(import.meta.env.VITE_MAP_MAX_ZOOM || '19', 10),
  /** Default map center (Thailand/Bangkok) */
  DEFAULT_CENTER: {
    lat: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LAT || '13.7563'),
    lng: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LNG || '100.5018'),
  },
  /** Default zoom level */
  DEFAULT_ZOOM: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM || '6', 10),
}

// Cache Configuration
export const CACHE_CONFIG = {
  /** Route cache TTL in milliseconds */
  ROUTE_CACHE_TTL_MS: parseInt(import.meta.env.VITE_CACHE_TTL_MS || '60000', 10),
  /** Maximum cache entries */
  ROUTE_CACHE_MAX_SIZE: parseInt(import.meta.env.VITE_CACHE_MAX_SIZE || '50', 10),
}

// Feature Flags
export const FEATURES = {
  /** Enable geolocation on startup */
  ENABLE_GEOLOCATION: import.meta.env.VITE_ENABLE_GEOLOCATION !== 'false',
  /** Geolocation timeout in milliseconds */
  GEOLOCATION_TIMEOUT_MS: parseInt(import.meta.env.VITE_GEOLOCATION_TIMEOUT_MS || '5000', 10),
  /** Geolocation accuracy threshold in meters */
  GEOLOCATION_ACCURACY_THRESHOLD: parseInt(
    import.meta.env.VITE_GEOLOCATION_ACCURACY_THRESHOLD || '1000',
    10
  ),
}

// App Metadata
export const APP_CONFIG = {
  /** Application version (injected at build time) */
  VERSION: import.meta.env.VITE_APP_VERSION || 'dev',
  /** Application name */
  NAME: import.meta.env.VITE_APP_NAME || 'EV Trip Planner',
}
