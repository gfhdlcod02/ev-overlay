import type { Env, RateLimitResult } from '../../types';
import { recordRateLimitMetric } from '../observability/dashboards/rate-limit-dashboard';

// Cloudflare Workers ExecutionContext
declare const ExecutionContext: {
  prototype: ExecutionContext;
};

/**
 * Rate Limit Middleware
 *
 * Applies rate limiting to requests using Durable Objects.
 */

// Rate limits by endpoint type
const RATE_LIMITS = {
  route: { limit: 100, windowMs: 3600000 },    // 100 req/hour for route planning
  station: { limit: 300, windowMs: 3600000 },  // 300 req/hour for station queries
  default: { limit: 600, windowMs: 3600000 }   // 600 req/hour default
};

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  request: Request,
  env: Env,
  endpointType: 'route' | 'station' | 'default' = 'default',
  ctx?: ExecutionContext
): Promise<RateLimitResult> {
  const clientKey = getClientKey(request);
  const limits = RATE_LIMITS[endpointType];

  try {
    // Get or create rate limiter DO for this client
    const id = env.RATE_LIMITER.idFromName(clientKey);
    const rateLimiter = env.RATE_LIMITER.get(id);

    // Call increment and check
    const response = await rateLimiter.fetch(
      `https://fake-host/?action=increment`,
      {
        method: 'POST'
      }
    );

    if (!response.ok) {
      // Fallback: allow request if DO fails
      console.error('Rate limiter DO error:', await response.text());
      return {
        allowed: true,
        limit: limits.limit,
        remaining: limits.limit,
        resetAt: Date.now() + limits.windowMs
      };
    }

    const result = await response.json<RateLimitResult>();

    // Record metric for dashboard (non-blocking)
    if (ctx) {
      ctx.waitUntil(recordRateLimitMetric(env, clientKey, result.allowed, result.remaining));
    } else {
      // Fire-and-forget if no context
      recordRateLimitMetric(env, clientKey, result.allowed, result.remaining).catch(console.error);
    }

    return result;
  } catch (error) {
    // Fallback: allow request on error
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      limit: limits.limit,
      remaining: limits.limit,
      resetAt: Date.now() + limits.windowMs
    };
  }
}

/**
 * Get client identifier from request
 * Uses CF-Connecting-IP header or X-Forwarded-For, falls back to 'unknown'
 */
function getClientKey(request: Request): string {
  // Try Cloudflare's connecting IP header first
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) {
    return cfIp;
  }

  // Fall back to X-Forwarded-For
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    // Take first IP in chain
    return forwarded.split(',')[0].trim();
  }

  // Last resort
  return 'unknown';
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString()
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create rate limit error response
 */
export function createRateLimitError(retryAfter: number): { error: string; message: string; retryAfter: number } {
  return {
    error: 'RATE_LIMITED',
    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    retryAfter
  };
}
