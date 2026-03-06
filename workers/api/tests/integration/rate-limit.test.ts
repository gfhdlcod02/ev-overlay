import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '@/features/routing/handlers/route'
import {
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimitError,
  getClientIP,
  getRateLimitKey,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
} from '@/features/rate-limiting/handlers/rate-limit'

// Mock KV namespace for testing
class MockKVNamespace implements KVNamespace {
  private data = new Map<string, { value: string; expiresAt?: number }>()

  async get(
    key: string,
    type?: 'text' | 'json' | 'arrayBuffer' | 'stream'
  ): Promise<string | object | ArrayBuffer | ReadableStream | null> {
    const entry = this.data.get(key)
    if (!entry) return null

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key)
      return null
    }

    if (type === 'json') {
      return JSON.parse(entry.value)
    }
    return entry.value
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; expiration?: number }
  ): Promise<void> {
    const expiresAt = options?.expirationTtl
      ? Date.now() + options.expirationTtl * 1000
      : options?.expiration
        ? options.expiration * 1000
        : undefined

    this.data.set(key, { value, expiresAt })
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  list = async () =>
    ({ keys: [], list_complete: true, cursor: '' }) as unknown as KVNamespaceListResult<
      unknown,
      string
    >

  getWithMetadata = async () =>
    ({ value: null, metadata: null }) as unknown as KVNamespaceGetWithMetadataResult<
      unknown,
      unknown
    >
}

describe('Rate Limiting', () => {
  let env: Env
  let mockKV: MockKVNamespace

  beforeEach(() => {
    mockKV = new MockKVNamespace()
    env = {
      ROUTE_CACHE: mockKV,
      OSRM_BASE_URL: 'https://router.project-osrm.org',
    }
  })

  describe('getClientIP', () => {
    it('should extract IP from CF-Connecting-IP header', () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })
      expect(getClientIP(request)).toBe('192.168.1.1')
    })

    it('should return "unknown" when header is missing', () => {
      const request = new Request('https://example.com')
      expect(getClientIP(request)).toBe('unknown')
    })
  })

  describe('getRateLimitKey', () => {
    it('should generate correct key format', () => {
      expect(getRateLimitKey('192.168.1.1')).toBe('rate_limit:192.168.1.1')
    })
  })

  describe('checkRateLimit', () => {
    it('should allow first request and create new window', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })

      const result = await checkRateLimit(request, env)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMIT_MAX - 1)
      expect(result.resetTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should allow requests under the limit', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(request, env)
        expect(result.allowed).toBe(true)
      }

      const result = await checkRateLimit(request, env)
      expect(result.remaining).toBe(RATE_LIMIT_MAX - 6)
    })

    it('should reject requests at the limit', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })

      // Make exactly RATE_LIMIT_MAX requests
      for (let i = 0; i < RATE_LIMIT_MAX; i++) {
        const result = await checkRateLimit(request, env)
        expect(result.allowed).toBe(true)
      }

      // Next request should be rejected
      const result = await checkRateLimit(request, env)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset window after expiration', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })

      // Fill up the rate limit
      for (let i = 0; i < RATE_LIMIT_MAX; i++) {
        await checkRateLimit(request, env)
      }

      // Verify rate limited
      let result = await checkRateLimit(request, env)
      expect(result.allowed).toBe(false)

      // Simulate window expiration by manually setting old timestamps
      const key = getRateLimitKey('192.168.1.1')
      const now = Date.now()
      const expiredEntry = {
        requests: Array(RATE_LIMIT_MAX).fill(now - (RATE_LIMIT_WINDOW + 1) * 1000),
      }
      await mockKV.put(key, JSON.stringify(expiredEntry), { expirationTtl: 1 })

      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 100))

      result = await checkRateLimit(request, env)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMIT_MAX - 1)
    })

    it('should track different IPs separately', async () => {
      const request1 = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })
      const request2 = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.2' },
      })

      // Fill up rate limit for IP 1
      for (let i = 0; i < RATE_LIMIT_MAX; i++) {
        await checkRateLimit(request1, env)
      }

      // IP 1 should be rate limited
      const result1 = await checkRateLimit(request1, env)
      expect(result1.allowed).toBe(false)

      // IP 2 should still be allowed
      const result2 = await checkRateLimit(request2, env)
      expect(result2.allowed).toBe(true)
    })

    it('should fail open when KV throws error', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' },
      })

      // Create a broken KV that throws errors
      const brokenEnv = {
        ...env,
        ROUTE_CACHE: {
          get: async () => {
            throw new Error('KV unavailable')
          },
          put: async () => {
            throw new Error('KV unavailable')
          },
          delete: async () => {},
          list: async () =>
            ({ keys: [], list_complete: true, cursor: '' }) as unknown as KVNamespaceListResult<
              unknown,
              string
            >,
          getWithMetadata: async () =>
            ({ value: null, metadata: null }) as unknown as KVNamespaceGetWithMetadataResult<
              unknown,
              unknown
            >,
        } as KVNamespace,
      }

      const result = await checkRateLimit(request, brokenEnv)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMIT_MAX)
    })
  })

  describe('getRateLimitHeaders', () => {
    it('should return correct headers for allowed request', () => {
      const result = {
        allowed: true,
        remaining: 45,
        resetTime: 1709312400,
      }

      const headers = getRateLimitHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe(RATE_LIMIT_MAX.toString())
      expect(headers['X-RateLimit-Remaining']).toBe('45')
      expect(headers['X-RateLimit-Reset']).toBe('1709312400')
      expect(headers['Retry-After']).toBeUndefined()
    })

    it('should include Retry-After for rate limited requests', () => {
      const now = Math.floor(Date.now() / 1000)
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: now + 45,
      }

      const headers = getRateLimitHeaders(result)

      expect(headers['Retry-After']).toBeDefined()
      const retryAfter = parseInt(headers['Retry-After'] || '0', 10)
      expect(retryAfter).toBeGreaterThanOrEqual(44)
      expect(retryAfter).toBeLessThanOrEqual(46)
    })
  })

  describe('createRateLimitError', () => {
    it('should create correct error response', () => {
      const error = createRateLimitError(45)

      expect(error).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Try again in 45 seconds.',
          retryAfter: 45,
        },
      })
    })
  })
})
