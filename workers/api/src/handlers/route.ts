// Location type used indirectly through normalize functions
import { fetchRouteFromOSRM, getOSRMOptions, OSRMError } from '../providers/osrm-client'
import { normalizeOSRMResponse, parseCoordinates } from '../providers/normalize'
import { generateCacheKey, getCachedRoute, cacheRoute } from '../cache/kv-cache'

export interface Env {
  ROUTE_CACHE: KVNamespace
  OSRM_BASE_URL?: string
}

export interface RouteRequest {
  origin: string
  destination: string
}

export async function handleRoute(
  request: Request,
  env: Env
): Promise<Response> {
  // Only accept GET requests
  if (request.method !== 'GET') {
    return jsonError('METHOD_NOT_ALLOWED', 'Only GET requests are allowed', 405)
  }

  // Parse query parameters
  const url = new URL(request.url)
  const originParam = url.searchParams.get('origin')
  const destinationParam = url.searchParams.get('destination')

  // Validate parameters
  if (!originParam || !destinationParam) {
    return jsonError(
      'INVALID_PARAMS',
      'Missing required parameters: origin, destination',
      400
    )
  }

  // Parse coordinates
  const origin = parseCoordinates(originParam)
  const destination = parseCoordinates(destinationParam)

  if (!origin) {
    return jsonError(
      'INVALID_PARAMS',
      'Invalid origin format. Use: lat,lng',
      400
    )
  }

  if (!destination) {
    return jsonError(
      'INVALID_PARAMS',
      'Invalid destination format. Use: lat,lng',
      400
    )
  }

  // Check cache
  const cacheKey = await generateCacheKey(origin, destination)
  const cachedRoute = await getCachedRoute(env.ROUTE_CACHE, cacheKey)

  if (cachedRoute) {
    return jsonResponse({ route: cachedRoute }, 200, { 'X-Cache': 'HIT' })
  }

  // Fetch from OSRM
  try {
    const options = getOSRMOptions(env)
    const osrmResponse = await fetchRouteFromOSRM(origin, destination, options)
    const route = normalizeOSRMResponse(osrmResponse, origin, destination)

    // Cache the result
    await cacheRoute(env.ROUTE_CACHE, cacheKey, route)

    return jsonResponse({ route }, 200, { 'X-Cache': 'MISS' })
  } catch (e) {
    if (e instanceof OSRMError) {
      return jsonError(e.code, e.message, e.statusCode)
    }

    console.error('Route error:', e instanceof Error ? e.message : 'Unknown error')
    return jsonError(
      'PROVIDER_ERROR',
      'Failed to fetch route from provider',
      502
    )
  }
}

function jsonResponse(
  data: unknown,
  status: number,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function jsonError(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status)
}
