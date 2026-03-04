import { describe, it, expect, beforeAll } from 'vitest'
import type { Env } from '../../src/handlers/route'
import { handleRoute } from '../../src/handlers/route'
import { generateCacheKey, getCachedRoute } from '../../src/cache/kv-cache'

// Mock KV namespace for testing
class MockKVNamespace implements KVNamespace {
  private data = new Map<string, string>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any> {
    const value = this.data.get(key)
    if (!value) return null

    if (type === 'json') {
      return JSON.parse(value)
    }
    return value
  }

  async put(key: string, value: string, _options?: { expirationTtl?: number }): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  // Unused methods required by interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list = async () =>
    ({ keys: [], list_complete: true, cursor: '' }) as unknown as KVNamespaceListResult<any, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWithMetadata = async () =>
    ({ value: null, metadata: null }) as unknown as KVNamespaceGetWithMetadataResult<any, any>
}

describe('handleRoute', () => {
  let env: Env
  let mockKV: MockKVNamespace

  beforeAll(() => {
    mockKV = new MockKVNamespace()
    env = {
      ROUTE_CACHE: mockKV,
      OSRM_BASE_URL: 'https://router.project-osrm.org',
    }
  })

  it('should return 400 for missing origin', async () => {
    const request = new Request('https://example.com/api/route?destination=34.0522,-118.2437')
    const response = await handleRoute(request, env)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_PARAMS')
  })

  it('should return 400 for missing destination', async () => {
    const request = new Request('https://example.com/api/route?origin=37.7749,-122.4194')
    const response = await handleRoute(request, env)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_PARAMS')
  })

  it('should return 400 for invalid origin format', async () => {
    const request = new Request(
      'https://example.com/api/route?origin=invalid&destination=34.0522,-118.2437'
    )
    const response = await handleRoute(request, env)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_PARAMS')
  })

  it('should return 400 for invalid coordinate bounds', async () => {
    const request = new Request('https://example.com/api/route?origin=91,0&destination=0,0')
    const response = await handleRoute(request, env)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_PARAMS')
  })

  it('should return 405 for non-GET methods', async () => {
    const request = new Request(
      'https://example.com/api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437',
      {
        method: 'POST',
      }
    )
    const response = await handleRoute(request, env)

    expect(response.status).toBe(405)
  })

  it('should generate consistent cache keys', async () => {
    const origin = { lat: 37.7749, lng: -122.4194 }
    const destination = { lat: 34.0522, lng: -118.2437 }

    const key1 = await generateCacheKey(origin, destination)
    const key2 = await generateCacheKey(origin, destination)

    expect(key1).toBe(key2)
    expect(key1.startsWith('route:')).toBe(true)
  })

  it('should cache and retrieve routes', async () => {
    const mockRoute = {
      origin: { lat: 37.7749, lng: -122.4194, address: 'SF' },
      destination: { lat: 34.0522, lng: -118.2437, address: 'LA' },
      distanceKm: 559,
      durationMin: 330,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-122.4194, 37.7749],
          [-118.2437, 34.0522],
        ],
      },
    }

    const key = await generateCacheKey(
      { lat: 37.7749, lng: -122.4194 },
      { lat: 34.0522, lng: -118.2437 }
    )

    // Store in cache
    await mockKV.put(key, JSON.stringify({ route: mockRoute, timestamp: Date.now() }))

    // Retrieve from cache
    const cached = await getCachedRoute(mockKV, key)

    expect(cached).not.toBeNull()
    expect(cached?.origin.lat).toBe(37.7749)
  })

  it('should return null for expired cache entries', async () => {
    const mockRoute = {
      origin: { lat: 37.7749, lng: -122.4194, address: 'SF' },
      destination: { lat: 34.0522, lng: -118.2437, address: 'LA' },
      distanceKm: 559,
      durationMin: 330,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-122.4194, 37.7749],
          [-118.2437, 34.0522],
        ],
      },
    }

    const key = 'route:expired:test'

    // Store expired entry (older than 7 days)
    const expiredTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000
    await mockKV.put(key, JSON.stringify({ route: mockRoute, timestamp: expiredTimestamp }))

    // Should return null for expired
    const cached = await getCachedRoute(mockKV, key)
    expect(cached).toBeNull()
  })
})

describe('Cache key generation', () => {
  it('should generate different keys for different origins', async () => {
    const key1 = await generateCacheKey(
      { lat: 37.7749, lng: -122.4194 },
      { lat: 34.0522, lng: -118.2437 }
    )
    const key2 = await generateCacheKey(
      { lat: 40.7128, lng: -74.006 },
      { lat: 34.0522, lng: -118.2437 }
    )

    expect(key1).not.toBe(key2)
  })

  it('should generate different keys for different destinations', async () => {
    const key1 = await generateCacheKey(
      { lat: 37.7749, lng: -122.4194 },
      { lat: 34.0522, lng: -118.2437 }
    )
    const key2 = await generateCacheKey(
      { lat: 37.7749, lng: -122.4194 },
      { lat: 40.7128, lng: -74.006 }
    )

    expect(key1).not.toBe(key2)
  })
})
