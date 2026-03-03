import type { Env } from './route'

// Rate limiting constants
export const RATE_LIMIT_MAX = 60 // requests per minute
export const RATE_LIMIT_WINDOW = 60 // seconds

// Rate limit entry stored in KV
export interface RateLimitEntry {
  /** Number of requests in current window */
  count: number
  /** Timestamp (ms) when window started */
  windowStart: number
}

// Result of rate limit check
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean
  /** Remaining requests in window */
  remaining: number
  /** Unix timestamp (seconds) when window resets */
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
 * Check if rate limit entry is within current window
 */
function isWithinWindow(entry: RateLimitEntry, now: number): boolean {
  return now - entry.windowStart <= RATE_LIMIT_WINDOW * 1000
}

/**
 * Check rate limit for a client
 * Uses sliding window algorithm with KV storage
 */
export async function checkRateLimit(
  request: Request,
  env: Env
): Promise<RateLimitResult> {
  const clientIP = getClientIP(request)
  const key = getRateLimitKey(clientIP)
  const now = Date.now()

  try {
    // Get existing rate limit entry
    const entry = await env.ROUTE_CACHE.get(key, 'json') as RateLimitEntry | null

    if (!entry) {
      // No entry - create new window
      const newEntry: RateLimitEntry = {
        count: 1,
        windowStart: now
      }
      await env.ROUTE_CACHE.put(key, JSON.stringify(newEntry), {
        expirationTtl: RATE_LIMIT_WINDOW
      })

      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX - 1,
        resetTime: Math.floor((now + RATE_LIMIT_WINDOW * 1000) / 1000)
      }
    }

    // Check if within current window
    if (!isWithinWindow(entry, now)) {
      // Window expired - reset
      const newEntry: RateLimitEntry = {
        count: 1,
        windowStart: now
      }
      await env.ROUTE_CACHE.put(key, JSON.stringify(newEntry), {
        expirationTtl: RATE_LIMIT_WINDOW
      })

      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX - 1,
        resetTime: Math.floor((now + RATE_LIMIT_WINDOW * 1000) / 1000)
      }
    }

    // Within window - check count
    if (entry.count >= RATE_LIMIT_MAX) {
      // Rate limit exceeded
      const resetTime = Math.floor((entry.windowStart + RATE_LIMIT_WINDOW * 1000) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // Increment count
    const updatedEntry: RateLimitEntry = {
      count: entry.count + 1,
      windowStart: entry.windowStart
    }
    await env.ROUTE_CACHE.put(key, JSON.stringify(updatedEntry), {
      expirationTtl: RATE_LIMIT_WINDOW
    })

    const resetTime = Math.floor((entry.windowStart + RATE_LIMIT_WINDOW * 1000) / 1000)
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - updatedEntry.count,
      resetTime
    }
  } catch (e) {
    // Fail open - allow request if KV fails
    console.error('Rate limit check failed:', e instanceof Error ? e.message : 'Unknown error')
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX,
      resetTime: Math.floor((now + RATE_LIMIT_WINDOW * 1000) / 1000)
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
