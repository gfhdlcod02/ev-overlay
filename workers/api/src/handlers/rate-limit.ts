import type { Env } from './route'

// Rate limiting constants
export const RATE_LIMIT_MAX = 60 // requests per minute
export const RATE_LIMIT_WINDOW = 60 // seconds

// Rate limit entry stored in KV - uses sliding window with request timestamps
export interface RateLimitEntry {
  /** Array of request timestamps (ms) within the current window */
  requests: number[]
}

// Result of rate limit check
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean
  /** Remaining requests in window */
  remaining: number
  /** Unix timestamp (seconds) when oldest request expires */
  resetTime: number
}

// Rate limit headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}

/**
 * Get client IP from Cloudflare header
 */
export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

/**
 * Generate rate limit key for KV storage
 */
export function getRateLimitKey(ip: string): string {
  return `rate_limit:${ip}`
}

/**
 * Filter out timestamps outside the rolling window
 */
function filterRecentRequests(timestamps: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs
  return timestamps.filter(ts => ts > cutoff)
}

/**
 * Calculate reset time based on oldest request in window
 */
function calculateResetTime(requests: number[], windowMs: number): number {
  if (requests.length === 0) {
    return Math.floor((Date.now() + windowMs) / 1000)
  }
  const oldestRequest = Math.min(...requests)
  return Math.floor((oldestRequest + windowMs) / 1000)
}

/**
 * Check rate limit for a client
 * Uses TRUE rolling window algorithm with KV storage
 * Only counts requests within the last 60 seconds
 */
export async function checkRateLimit(
  request: Request,
  env: Env
): Promise<RateLimitResult> {
  const clientIP = getClientIP(request)
  const key = getRateLimitKey(clientIP)
  const now = Date.now()
  const windowMs = RATE_LIMIT_WINDOW * 1000

  try {
    // Get existing rate limit entry
    const entry = await env.ROUTE_CACHE.get(key, 'json') as RateLimitEntry | null

    if (!entry || !entry.requests) {
      // No entry - create new with first request
      const newEntry: RateLimitEntry = {
        requests: [now]
      }
      await env.ROUTE_CACHE.put(key, JSON.stringify(newEntry), {
        expirationTtl: RATE_LIMIT_WINDOW
      })

      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX - 1,
        resetTime: Math.floor((now + windowMs) / 1000)
      }
    }

    // Filter to only recent requests (true rolling window)
    const recentRequests = filterRecentRequests(entry.requests, now, windowMs)

    // Check if limit exceeded
    if (recentRequests.length >= RATE_LIMIT_MAX) {
      // Rate limit exceeded
      const resetTime = calculateResetTime(recentRequests, windowMs)
      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // Add current request and update KV
    const updatedRequests = [...recentRequests, now]
    const updatedEntry: RateLimitEntry = {
      requests: updatedRequests
    }
    await env.ROUTE_CACHE.put(key, JSON.stringify(updatedEntry), {
      expirationTtl: RATE_LIMIT_WINDOW
    })

    const resetTime = calculateResetTime(updatedRequests, windowMs)
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - updatedRequests.length,
      resetTime
    }
  } catch (e) {
    // Fail open - allow request if KV fails
    console.error('Rate limit check failed:', e instanceof Error ? e.message : 'Unknown error')
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX,
      resetTime: Math.floor((now + windowMs) / 1000)
    }
  }
}

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': result.resetTime.toString()
  }

  // Add Retry-After only when rate limited
  if (!result.allowed) {
    const retryAfter = Math.max(0, result.resetTime - Math.floor(Date.now() / 1000))
    headers['Retry-After'] = retryAfter.toString()
  }

  return headers
}

/**
 * Create rate limit exceeded error response
 */
export function createRateLimitError(retryAfter: number): object {
  return {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter
    }
  }
}
