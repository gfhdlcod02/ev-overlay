import type { Location } from '@ev/core'

export interface OSRMOptions {
  baseUrl: string
  connectTimeoutMs: number
  requestTimeoutMs: number
  retries: number
}

export interface OSRMRoute {
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  distance: number // meters
  duration: number // seconds
  legs: unknown[]
  weight: number
  weight_name: string
}

export interface OSRMResponse {
  code: string
  routes: OSRMRoute[]
  waypoints: unknown[]
}

export class OSRMError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'OSRMError'
  }
}

/**
 * Fetch route from OSRM with retries and timeout
 */
export async function fetchRouteFromOSRM(
  origin: Location,
  destination: Location,
  options: OSRMOptions
): Promise<OSRMResponse> {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  const url = `${options.baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), options.requestTimeoutMs)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new OSRMError(
          'PROVIDER_ERROR',
          `OSRM returned ${response.status}`,
          502
        )
      }

      const data: OSRMResponse = await response.json()

      if (data.code !== 'Ok') {
        throw new OSRMError(
          data.code,
          getErrorMessageForCode(data.code),
          getStatusCodeForCode(data.code)
        )
      }

      if (!data.routes || data.routes.length === 0) {
        throw new OSRMError('NO_ROUTE', 'No route found between locations', 404)
      }

      return data
    } catch (e) {
      if (e instanceof OSRMError) {
        throw e
      }

      if (e instanceof Error && e.name === 'AbortError') {
        lastError = new OSRMError('TIMEOUT', 'Request to OSRM timed out', 504)
      } else {
        lastError = e instanceof Error ? e : new Error(String(e))
      }

      // Retry on timeout, but not on the last attempt
      if (attempt < options.retries && lastError instanceof OSRMError && lastError.code === 'TIMEOUT') {
        // Wait before retrying (exponential backoff)
        await delay(1000 * Math.pow(2, attempt))
        continue
      }

      break
    }
  }

  throw lastError || new OSRMError('PROVIDER_ERROR', 'Failed to fetch route', 502)
}

function getErrorMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    NoRoute: 'No route found between the specified locations',
    NotImplemented: 'This feature is not implemented',
    InvalidUrl: 'Invalid URL provided',
    InvalidService: 'Invalid service requested',
    InvalidVersion: 'Invalid version requested',
    InvalidOptions: 'Invalid options provided',
    InvalidQuery: 'Invalid query string',
    TooBig: 'Request is too large',
  }
  return messages[code] || `OSRM error: ${code}`
}

function getStatusCodeForCode(code: string): number {
  const codes: Record<string, number> = {
    NoRoute: 404,
    NotImplemented: 501,
  }
  return codes[code] || 502
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get OSRM client options from environment
 */
export function getOSRMOptions(env: { OSRM_BASE_URL?: string }): OSRMOptions {
  return {
    baseUrl: env.OSRM_BASE_URL || 'https://router.project-osrm.org',
    connectTimeoutMs: 5000,
    requestTimeoutMs: 20000,
    retries: 1,
  }
}
