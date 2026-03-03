/**
 * Coordinate validation utilities
 */

/**
 * Validates latitude is within valid range (-90 to 90)
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * Validates longitude is within valid range (-180 to 180)
 */
export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
}

/**
 * Validates accuracy is a non-negative number
 */
export function isValidAccuracy(accuracy: number): boolean {
  return typeof accuracy === 'number' && !isNaN(accuracy) && accuracy >= 0
}

/**
 * Validates a complete coordinate pair
 */
export function isValidCoordinate(
  lat: number,
  lng: number,
  accuracy?: number
): boolean {
  const validLat = isValidLatitude(lat)
  const validLng = isValidLongitude(lng)
  const validAccuracy = accuracy === undefined || isValidAccuracy(accuracy)
  return validLat && validLng && validAccuracy
}

/**
 * Checks if accuracy is within acceptable threshold for auto-population
 * @param accuracy - Accuracy radius in meters
 * @param threshold - Maximum acceptable accuracy in meters (default: 1000)
 * @returns true if accuracy is acceptable
 */
export function isAccuracyAcceptable(
  accuracy: number,
  threshold: number = 1000
): boolean {
  return isValidAccuracy(accuracy) && accuracy <= threshold
}

/**
 * Default map view for Thailand (Bangkok center)
 */
export const THAILAND_DEFAULT = {
  center: [13.7563, 100.5018] as [number, number],
  zoom: 6,
}

/**
 * Default zoom level when centering on user location
 */
export const USER_LOCATION_ZOOM = 13

/**
 * Animation duration for flyTo in seconds
 */
export const FLY_TO_DURATION_SECS = 1.5

/**
 * Geolocation timeout in milliseconds
 */
export const GEOLOCATION_TIMEOUT = 5000

/**
 * sessionStorage key for location data
 */
export const STORAGE_KEY = 'ev-overlay:location'

/**
 * Format a number to fixed decimal places using dot as decimal separator
 * Works around locale issues where toFixed() might use comma in some locales
 */
export function formatCoordinate(value: number, decimals: number = 6): string {
  // Use toFixed and force replace comma with dot to handle locale issues
  // This ensures consistent coordinate format across all browsers/locales
  return value.toFixed(decimals).replace(/,/g, '.')
}

/**
 * Format coordinates as "lat,lng" string for API usage
 * Ensures consistent formatting regardless of browser locale
 */
export function formatCoordinatePair(lat: number, lng: number): string {
  return `${formatCoordinate(lat)},${formatCoordinate(lng)}`
}
