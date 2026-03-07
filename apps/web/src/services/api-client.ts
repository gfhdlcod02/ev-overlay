import type { Location, Route } from '@core'
import { SearchCache, normalizeSearchKey } from './request-cache'
import type { PendingRequest } from '@/types'
import { API_CONFIG, GEOCODING_CONFIG, CACHE_CONFIG } from '@/config'

const API_BASE_URL = API_CONFIG.BASE_URL

// Cache configuration from centralized config
const CACHE_TTL_MS = CACHE_CONFIG.ROUTE_CACHE_TTL_MS
const CACHE_MAX_SIZE = CACHE_CONFIG.ROUTE_CACHE_MAX_SIZE

// Global cache instance
const routeCache = new SearchCache<Route>({
  ttlMs: CACHE_TTL_MS,
  maxSize: CACHE_MAX_SIZE,
})

// Global pending requests map for deduplication
const pendingRequests = new Map<string, PendingRequest<Route>>()

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
 * Check if error is an AbortError (user cancelled)
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Fetch route from API with caching, deduplication, and cancellation
 */
export async function fetchRoute(
  request: RouteRequest,
  options: { signal?: AbortSignal } = {}
): Promise<Route> {
  const cacheKey = normalizeSearchKey(request.origin, request.destination)

  // Check cache first
  const cached = routeCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Check for pending request (deduplication)
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    // Return the existing promise
    try {
      return await pending.promise
    } catch (error) {
      // If the pending request was aborted, we should try again
      if (isAbortError(error)) {
        // Continue to make a new request
      } else {
        throw error
      }
    }
  }

  // Create new request
  const controller = new AbortController()

  // Link external signal if provided
  if (options.signal) {
    // Handle already-aborted signals immediately
    if (options.signal.aborted) {
      controller.abort()
    } else {
      options.signal.addEventListener('abort', () => {
        controller.abort()
      })
    }
  }

  const promise = fetchRouteInternal(request, controller.signal, cacheKey)

  // Register as pending
  pendingRequests.set(cacheKey, { promise, controller })

  try {
    const result = await promise
    return result
  } finally {
    // Clean up pending request only if it's still our request
    // (guards against deleting a newer request that started after we were cancelled)
    const currentPending = pendingRequests.get(cacheKey)
    if (currentPending?.promise === promise) {
      pendingRequests.delete(cacheKey)
    }
  }
}

/**
 * Internal fetch implementation - uses v1 API
 */
async function fetchRouteInternal(
  request: RouteRequest,
  signal: AbortSignal,
  cacheKey: string
): Promise<Route> {
  let response: Response

  try {
    // Parse coordinates from origin/destination strings
    const [originLat, originLng] = request.origin.split(',').map(s => parseFloat(s.trim()))
    const [destLat, destLng] = request.destination.split(',').map(s => parseFloat(s.trim()))

    // Call new v1 API with POST and JSON body
    response = await fetch(`${API_BASE_URL}/api/v1/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        vehicle: {
          batteryCapacityKwh: 77,
          rangeKmAt100Percent: 450,
          currentSocPercent: 80,
          reserveSocPercent: 20,
        },
      }),
      signal,
    })
  } catch (e) {
    // Don't throw for abort errors - let them propagate naturally
    if (isAbortError(e)) {
      throw e
    }
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

  // Transform v1 API response to internal Route format
  const data = await response.json()

  const from = data.route.legs[0]?.from || { lat: 0, lng: 0 }
  const to = data.route.legs[data.route.legs.length - 1]?.to || { lat: 0, lng: 0 }

  // Decode polyline to geometry (simplified - just use the polyline as-is for LineString)
  // In a real implementation, you'd decode the Google polyline format
  const route: Route = {
    origin: { lat: from.lat, lng: from.lng, address: from.name },
    destination: { lat: to.lat, lng: to.lng, address: to.name },
    distanceKm: data.route.distance / 1000,
    durationMin: data.route.duration / 60,
    geometry: { type: 'LineString', coordinates: [] }, // Placeholder - would decode polyline
  }

  // Cache the result
  routeCache.set(cacheKey, route)

  return route
}

/**
 * Cancel any pending route request for the given origin/destination
 */
export function cancelRouteRequest(origin: string, destination: string): void {
  const cacheKey = normalizeSearchKey(origin, destination)
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    pending.controller.abort()
    pendingRequests.delete(cacheKey)
  }
}

/**
 * Cancel all pending route requests
 */
export function cancelAllRouteRequests(): void {
  for (const [, pending] of pendingRequests) {
    pending.controller.abort()
  }
  pendingRequests.clear()
}

/**
 * Clear the route cache
 */
export function clearRouteCache(): void {
  routeCache.clear()
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getRouteCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return routeCache.getStats()
}

/**
 * Geocode an address to coordinates
 * Uses a simple geocoding service
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `${GEOCODING_CONFIG.NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': GEOCODING_CONFIG.USER_AGENT,
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
