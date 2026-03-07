import type { DurableObjectState, Request } from '@cloudflare/workers-types';

/**
 * Rate Limiter Durable Object
 *
 * Implements sliding window rate limiting with per-client tracking.
 * Each client (IP or user ID) gets its own DO instance.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitState {
  requests: number[];  // Timestamps of requests in current window
  windowStart: number;
}

export class RateLimiter {
  private state: DurableObjectState;
  private limit: number;
  private windowMs: number;

  constructor(state: DurableObjectState, env: { LIMIT?: string; WINDOW_MS?: string }) {
    this.state = state;
    this.limit = parseInt(env.LIMIT || '100', 10);
    this.windowMs = parseInt(env.WINDOW_MS || '3600000', 10); // 1 hour default
  }

  /**
   * Handle incoming request to check rate limit
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'check') {
      const result = await this.checkLimit();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'increment') {
      const result = await this.incrementAndCheck();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Invalid action', { status: 400 });
  }

  /**
   * Check current rate limit without incrementing
   */
  async checkLimit(): Promise<RateLimitResult> {
    const now = Date.now();
    const state = await this.getState();

    // Clean old requests outside the window
    const validRequests = this.cleanOldRequests(state.requests, now);

    const remaining = Math.max(0, this.limit - validRequests.length);
    const resetAt = state.windowStart + this.windowMs;

    return {
      allowed: remaining > 0,
      limit: this.limit,
      remaining,
      resetAt
    };
  }

  /**
   * Increment counter and check if request is allowed
   */
  async incrementAndCheck(): Promise<RateLimitResult> {
    const now = Date.now();
    let state = await this.getState();

    // Clean old requests
    const validRequests = this.cleanOldRequests(state.requests, now);

    // Check if under limit
    if (validRequests.length >= this.limit) {
      const resetAt = state.windowStart + this.windowMs;
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        resetAt,
        retryAfter
      };
    }

    // Add current request
    validRequests.push(now);

    // Update state
    await this.state.storage.put('rateLimit', {
      requests: validRequests,
      windowStart: state.windowStart
    });

    return {
      allowed: true,
      limit: this.limit,
      remaining: this.limit - validRequests.length,
      resetAt: state.windowStart + this.windowMs
    };
  }

  /**
   * Get current rate limit state from storage
   */
  private async getState(): Promise<RateLimitState> {
    const stored = await this.state.storage.get<RateLimitState>('rateLimit');
    const now = Date.now();

    if (!stored) {
      return {
        requests: [],
        windowStart: now
      };
    }

    // Reset window if expired
    if (now > stored.windowStart + this.windowMs) {
      return {
        requests: [],
        windowStart: now
      };
    }

    return stored;
  }

  /**
   * Remove requests outside the time window
   */
  private cleanOldRequests(requests: number[], now: number): number[] {
    const cutoff = now - this.windowMs;
    return requests.filter(ts => ts > cutoff);
  }
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
 * Create rate limit error response body
 */
export function createRateLimitError(retryAfter: number): { error: string; message: string; retryAfter: number } {
  return {
    error: 'RATE_LIMITED',
    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    retryAfter
  };
}
