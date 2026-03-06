import type { Location, Route, LineString } from '@ev/core'
import type { OSRMResponse } from './osrm-client'

/**
 * Normalize OSRM response to internal Route format
 *
 * @param osrm - Raw OSRM response
 * @param origin - Origin location (for response enrichment)
 * @param destination - Destination location (for response enrichment)
 * @returns Normalized Route
 */
export function normalizeOSRMResponse(
  osrm: OSRMResponse,
  origin: Location,
  destination: Location
): Route {
  if (osrm.code !== 'Ok' || !osrm.routes?.length) {
    throw new Error(`OSRM returned error code: ${osrm.code}`)
  }

  const route = osrm.routes[0]

  return {
    origin: {
      lat: origin.lat,
      lng: origin.lng,
      address: origin.address || `${origin.lat},${origin.lng}`,
    },
    destination: {
      lat: destination.lat,
      lng: destination.lng,
      address: destination.address || `${destination.lat},${destination.lng}`,
    },
    distanceKm: Math.round((route.distance / 1000) * 10) / 10, // meters to km, 1 decimal
    durationMin: Math.ceil(route.duration / 60), // seconds to minutes, round up
    geometry: route.geometry as LineString,
  }
}

/**
 * Parse coordinates from query string format "lat,lng"
 */
export function parseCoordinates(coordString: string): Location | null {
  const parts = coordString.split(',').map(s => s.trim())

  if (parts.length !== 2) {
    return null
  }

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  if (isNaN(lat) || isNaN(lng)) {
    return null
  }

  // Validate bounds
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}
