import type { Location, ChargingStop } from '../types'

/**
 * Build Google Maps navigation URL with waypoints
 *
 * Format: https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&waypoints={lat},{lng}|{lat},{lng}...
 *
 * @param origin - Starting location
 * @param destination - Ending location
 * @param stops - Optional charging stops to include as waypoints
 * @returns Full Google Maps URL
 */
export function buildGoogleMapsUrl(
  origin: Location,
  destination: Location,
  stops: ChargingStop[] = []
): string {
  const baseUrl = 'https://www.google.com/maps/dir/?api=1'

  const params = new URLSearchParams()

  // Origin
  params.set('origin', `${origin.lat},${origin.lng}`)

  // Destination
  params.set('destination', `${destination.lat},${destination.lng}`)

  // Waypoints (charging stops)
  if (stops.length > 0) {
    const waypoints = stops
      .sort((a, b) => a.sequence - b.sequence)
      .map(stop => `${stop.position.lat},${stop.position.lng}`)
      .join('|')
    params.set('waypoints', waypoints)
  }

  // Travel mode: driving
  params.set('travelmode', 'driving')

  return `${baseUrl}&${params.toString()}`
}

/**
 * Build Google Maps URL for mobile deep linking
 *
 * Uses the comgooglemaps:// scheme for iOS/Android app opening
 *
 * @param origin - Starting location
 * @param destination - Ending location
 * @param stops - Optional charging stops
 * @returns Google Maps mobile URL
 */
export function buildGoogleMapsMobileUrl(
  origin: Location,
  destination: Location,
  stops: ChargingStop[] = []
): string {
  // For mobile, use the same web URL - it will redirect to the app if installed
  return buildGoogleMapsUrl(origin, destination, stops)
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}
