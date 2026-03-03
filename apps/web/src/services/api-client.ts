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
 * Check if response is JSON
 */
function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type')
  return contentType?.includes('application/json') ?? false
}

/**
 * Parse error response with fallback for non-JSON responses
 */
async function parseErrorResponse(response: Response): Promise<string> {
  // Check if response is actually JSON
  if (!isJsonResponse(response)) {
    // Likely an HTML error page (404, 500, etc.)
    const text = await response.text()
    // Check for common HTML error patterns
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      return `Service Error: API returned HTML instead of JSON (status ${response.status}). The API server may be down or misconfigured.`
    }
    return `Service Error: Unexpected response (status ${response.status})`
  }

  // Try to parse as JSON error
  try {
    const errorData: ApiError = await response.json()
    return errorData.error.message || `Service Error: ${errorData.error.code}`
  } catch {
    return `Service Error: ${response.status} ${response.statusText}`
  }
}

/**
 * Fetch route from API with geocoding
 */
export async function fetchRoute(request: RouteRequest): Promise<Route> {
  let response: Response

  try {
    const params = new URLSearchParams({
      origin: request.origin,
      destination: request.destination,
    })

    response = await fetch(`${API_BASE_URL}/route?${params}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (e) {
    // Network error - API unreachable
    throw new Error(
      'Service Error: Cannot connect to API server. Please ensure the API is running (pnpm dev:all).'
    )
  }

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response)
    throw new Error(errorMessage)
  }

  // Check if success response is actually JSON
  if (!isJsonResponse(response)) {
    throw new Error(
      'Service Error: API returned unexpected format. Please check API configuration.'
    )
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
