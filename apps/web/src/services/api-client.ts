import type { Location, Route } from '@ev/core'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface RouteRequest {
  origin: string
  destination: string
}

export interface RouteResponse {
  route: Route
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

/**
 * Fetch route from API with geocoding
 */
export async function fetchRoute(request: RouteRequest): Promise<Route> {
  const params = new URLSearchParams({
    origin: request.origin,
    destination: request.destination,
  })

  const response = await fetch(`${API_BASE_URL}/route?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Unknown error occurred' },
    }))
    throw new Error(errorData.error.message)
  }

  const data: RouteResponse = await response.json()
  return data.route
}

/**
 * Geocode an address to coordinates
 * Uses a simple geocoding service
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'EV-Overlay/1.0',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const results = await response.json()
    if (results.length === 0) {
      return null
    }

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      address: results[0].display_name,
    }
  } catch {
    return null
  }
}
