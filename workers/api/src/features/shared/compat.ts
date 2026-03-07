/**
 * API Compatibility Layer
 * Translates between old and new API formats during migration
 */

import type { RouteRequest, RouteResponse } from '../../types'

/**
 * Legacy route request format (old API)
 */
interface LegacyRouteRequest {
  origin: string | { lat: number; lng: number; name?: string }
  destination: string | { lat: number; lng: number; name?: string }
  batteryCapacity?: number
  rangeAt100Percent?: number
  currentBatteryLevel?: number
  reserveBuffer?: number
  drivingEfficiency?: number
}

/**
 * Legacy route response format (old API)
 */
interface LegacyRouteResponse {
  route: {
    distance: number
    duration: number
    polyline: string
  }
  chargingStops: Array<{
    location: { lat: number; lng: number }
    name: string
    arrivalSoc: number
    departureSoc: number
    chargeDuration: number
  }>
  safeRange: number
}

/**
 * Convert legacy route request to new format
 */
export function convertLegacyRequest(legacy: LegacyRouteRequest): RouteRequest {
  const parseLocation = (loc: string | { lat: number; lng: number; name?: string }): { lat: number; lng: number; name?: string } => {
    if (typeof loc === 'string') {
      // Simple geocoding assumption - in real implementation, would call geocoding service
      throw new Error('String locations require geocoding - not supported in compatibility mode')
    }
    return loc
  }

  return {
    origin: parseLocation(legacy.origin),
    destination: parseLocation(legacy.destination),
    vehicle: {
      batteryCapacityKwh: legacy.batteryCapacity || 77,
      rangeKmAt100Percent: legacy.rangeAt100Percent || 450,
      currentSocPercent: legacy.currentBatteryLevel || 80,
      reserveSocPercent: legacy.reserveBuffer || 20,
      drivingFactor: legacy.drivingEfficiency || 1.0,
    },
    preferences: {
      maxChargingStops: 5,
      chargeToPercent: 80,
    },
  }
}

/**
 * Convert new route response to legacy format
 */
export function convertToLegacyResponse(response: RouteResponse): LegacyRouteResponse {
  return {
    route: {
      distance: response.route.distance,
      duration: response.route.duration,
      polyline: response.route.polyline,
    },
    chargingStops: response.chargingStops.map(stop => ({
      location: { lat: stop.station.lat, lng: stop.station.lng },
      name: stop.station.name,
      arrivalSoc: stop.arrivalSoc,
      departureSoc: stop.departureSoc,
      chargeDuration: stop.chargeDurationMinutes * 60, // Convert to seconds
    })),
    safeRange: response.safeRangeKm * 1000, // Convert to meters
  }
}

/**
 * Detect if request is in legacy format
 */
export function isLegacyRequest(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false

  const req = body as Record<string, unknown>

  // Check for legacy field names
  return (
    'currentBatteryLevel' in req ||
    'reserveBuffer' in req ||
    'drivingEfficiency' in req ||
    'rangeAt100Percent' in req
  )
}

/**
 * Compatibility middleware wrapper
 * Wraps a handler to support both old and new API formats
 */
export function withCompatibility<
  Env = unknown,
>(
  handler: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>
): (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> {
  return async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    // Check for API version header
    const apiVersion = request.headers.get('X-API-Version')

    // Clone request to potentially modify body
    if (request.method === 'POST' && apiVersion === 'legacy') {
      const body = await request.json().catch(() => null)

      if (body && isLegacyRequest(body)) {
        try {
          const convertedBody = convertLegacyRequest(body as LegacyRouteRequest)

          // Create new request with converted body
          const newRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(convertedBody),
          })

          // Call handler and convert response
          const response = await handler(newRequest, env, ctx)

          if (response.ok) {
            const newResponse = await response.json()
            const legacyResponse = convertToLegacyResponse(newResponse as RouteResponse)

            return new Response(JSON.stringify(legacyResponse), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return response
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: 'COMPATIBILITY_ERROR',
              message: error instanceof Error ? error.message : 'Failed to convert legacy request',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Pass through for new format or non-POST requests
    return handler(request, env, ctx)
  }
}
