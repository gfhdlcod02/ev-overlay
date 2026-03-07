import type { Location } from '@core'
import { SearchCache, normalizeSearchKey } from './request-cache'
import type { PendingRequest } from '@/types'
import { API_CONFIG, CACHE_CONFIG } from '@/config'

const API_BASE_URL = API_CONFIG.BASE_URL

// Cache configuration from centralized config
const CACHE_TTL_MS = CACHE_CONFIG.ROUTE_CACHE_TTL_MS
const CACHE_MAX_SIZE = CACHE_CONFIG.ROUTE_CACHE_MAX_SIZE

// Global cache instance
const routeCache = new SearchCache<RoutePlanningResponse>({
  ttlMs: CACHE_TTL_MS,
  maxSize: CACHE_MAX_SIZE,
})

// Global pending requests map for deduplication
const pendingRequests = new Map<string, PendingRequest<{ response: RoutePlanningResponse; rateLimit?: RateLimitInfo }>>()

/**
 * Vehicle parameters for route planning
 */
export interface VehicleParams {
  batteryCapacityKwh: number
  rangeKmAt100Percent: number
  currentSocPercent: number
  targetSocPercent?: number
  reserveSocPercent?: number
  minChargeSoc?: number
  drivingFactor?: number
}

/**
 * Route request for v1 API
 */
export interface RoutePlanningRequest {
  origin: Location
  destination: Location
  vehicle: VehicleParams
}

/**
 * Charging stop in route response
 */
export interface ChargingStop {
  stationId: string
  name: string
  location: Location
  distanceFromStart: number
  chargeDurationMinutes: number
  targetSocPercent: number
}

/**
 * Route leg in response
 */
export interface RouteLeg {
  from: Location & { name?: string }
  to: Location & { name?: string }
  distance: number
  duration: number
  consumptionKwh: number
}

/**
 * Route data in response
 */
export interface RouteData {
  distance: number
  duration: number
  polyline: string
  legs: RouteLeg[]
}

/**
 * Full route planning response
 */
export interface RoutePlanningResponse {
  route: RouteData
  chargingStops: ChargingStop[]
  safeRangeKm: number
}

/**
 * Station connector info
 */
export interface StationConnector {
  type: string
  powerKw?: number
}

/**
 * Compact station for list queries
 */
export interface CompactStation {
  id: string
  name: string
  lat: number
  lng: number
  status: string
  connectors: StationConnector[]
}

/**
 * API error response
 */
export interface ApiError {
  error: {
    code: string
    message: string
    requestId?: string
  }
}

/**
 * Rate limit info from response headers
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: number
  retryAfter?: number
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
  if (!isJsonResponse(response)) {
    const text = await response.text()
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      return `Service Error: API returned HTML instead of JSON (status ${response.status}). The API server may be down or misconfigured.`
    }
    return `Service Error: Unexpected response (status ${response.status})`
  }

  try {
    const errorData: ApiError = await response.json()
    return errorData.error.message || `Service Error: ${errorData.error.code}`
  } catch {
    return `Service Error: ${response.status} ${response.statusText}`
  }
}

/**
 * Extract rate limit info from response headers
 */
function extractRateLimitInfo(response: Response): RateLimitInfo | undefined {
  const limit = response.headers.get('X-RateLimit-Limit')
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const reset = response.headers.get('X-RateLimit-Reset')
  const retryAfter = response.headers.get('Retry-After')

  if (!limit || !remaining || !reset) {
    return undefined
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetAt: parseInt(reset, 10),
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
  }
}

/**
 * Check if error is an AbortError (user cancelled)
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Generate cache key for route request
 */
function generateRouteCacheKey(request: RoutePlanningRequest): string {
  const vehicleKey = `${request.vehicle.batteryCapacityKwh}-${request.vehicle.rangeKmAt100Percent}-${request.vehicle.currentSocPercent}`
  return normalizeSearchKey(
    `${request.origin.lat},${request.origin.lng}`,
    `${request.destination.lat},${request.destination.lng}`,
  ) + `:${vehicleKey}`
}

/**
 * Plan a route with charging stops using v1 API
 */
export async function planRoute(
  request: RoutePlanningRequest,
  options: { signal?: AbortSignal } = {},
): Promise<{ response: RoutePlanningResponse; rateLimit?: RateLimitInfo; fromCache: boolean }> {
  const cacheKey = generateRouteCacheKey(request)

  // Check cache first
  const cached = routeCache.get(cacheKey)
  if (cached) {
    return { response: cached, fromCache: true }
  }

  // Check for pending request (deduplication)
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    try {
      const result = await pending.promise
      return { response: result.response, rateLimit: result.rateLimit, fromCache: false }
    } catch (error) {
      if (isAbortError(error)) {
        // Continue to make a new request
      } else {
        throw error
      }
    }
  }

  // Create new request
  const controller = new AbortController()

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort()
    } else {
      options.signal.addEventListener('abort', () => {
        controller.abort()
      })
    }
  }

  const promise = planRouteInternal(request, controller.signal, cacheKey)
  pendingRequests.set(cacheKey, { promise, controller })

  try {
    const result = await promise
    return { ...result, fromCache: false }
  } finally {
    const currentPending = pendingRequests.get(cacheKey)
    if (currentPending?.promise === promise) {
      pendingRequests.delete(cacheKey)
    }
  }
}

/**
 * Internal route planning implementation
 */
async function planRouteInternal(
  request: RoutePlanningRequest,
  signal: AbortSignal,
  cacheKey: string,
): Promise<{ response: RoutePlanningResponse; rateLimit?: RateLimitInfo }> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    })
  } catch (e) {
    if (isAbortError(e)) {
      throw e
    }
    throw new Error(
      'Service Error: Cannot connect to API server. Please ensure the API is running (pnpm dev:all).',
    )
  }

  const rateLimit = extractRateLimitInfo(response)

  if (!response.ok) {
    if (response.status === 429 && rateLimit?.retryAfter) {
      throw new Error(`Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`)
    }
    const errorMessage = await parseErrorResponse(response)
    throw new Error(errorMessage)
  }

  if (!isJsonResponse(response)) {
    throw new Error('Service Error: API returned unexpected format. Please check API configuration.')
  }

  const data: RoutePlanningResponse = await response.json()

  // Cache the result
  routeCache.set(cacheKey, data)

  return { response: data, rateLimit }
}

/**
 * Query stations within bounding box
 */
export async function queryStations(
  bbox: { lat1: number; lng1: number; lat2: number; lng2: number },
  options: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<{ stations: CompactStation[]; total: number; rateLimit: RateLimitInfo | undefined }> {
  const params = new URLSearchParams({
    lat1: bbox.lat1.toString(),
    lng1: bbox.lng1.toString(),
    lat2: bbox.lat2.toString(),
    lng2: bbox.lng2.toString(),
    limit: (options.limit ?? 50).toString(),
    offset: (options.offset ?? 0).toString(),
  })

  const response = await fetch(`${API_BASE_URL}/api/v1/stations?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  })

  const rateLimit = extractRateLimitInfo(response)

  if (!response.ok) {
    if (response.status === 429 && rateLimit?.retryAfter) {
      throw new Error(`Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`)
    }
    const errorMessage = await parseErrorResponse(response)
    throw new Error(errorMessage)
  }

  const data = await response.json() as { stations: CompactStation[]; total: number }
  return { ...data, rateLimit }
}

/**
 * Get station details by ID
 */
export async function getStationDetail(
  stationId: string,
  options: { signal?: AbortSignal } = {},
): Promise<{ station: unknown | null; rateLimit: RateLimitInfo | undefined }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/stations/${stationId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  })

  const rateLimit = extractRateLimitInfo(response)

  if (response.status === 404) {
    return { station: null, rateLimit }
  }

  if (!response.ok) {
    if (response.status === 429 && rateLimit?.retryAfter) {
      throw new Error(`Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`)
    }
    const errorMessage = await parseErrorResponse(response)
    throw new Error(errorMessage)
  }

  const station = await response.json()
  return { station, rateLimit }
}

/**
 * Cancel any pending route request
 */
export function cancelRouteRequest(request: RoutePlanningRequest): void {
  const cacheKey = generateRouteCacheKey(request)
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    pending.controller.abort()
    pendingRequests.delete(cacheKey)
  }
}

/**
 * Cancel all pending requests
 */
export function cancelAllRequests(): void {
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
