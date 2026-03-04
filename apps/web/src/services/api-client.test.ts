import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchRoute,
  cancelRouteRequest,
  cancelAllRouteRequests,
  clearRouteCache,
  getRouteCacheStats,
  geocodeAddress,
} from './api-client'
import type { Route } from '@ev/core'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('fetchRoute', () => {
  const mockRoute: Route = {
    origin: { lat: 13.7563, lng: 100.5018, address: 'Bangkok' },
    destination: { lat: 18.7883, lng: 98.9853, address: 'Chiang Mai' },
    distanceKm: 685.5,
    durationMin: 420,
    polyline: 'encoded_polyline',
    legs: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clearRouteCache()
    cancelAllRouteRequests()
    vi.useFakeTimers()
  })

  describe('basic functionality', () => {
    it('should fetch and return route', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ route: mockRoute }),
      })

      const result = await fetchRoute({
        origin: 'Bangkok',
        destination: 'Chiang Mai',
      })

      expect(result).toEqual(mockRoute)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })).rejects.toThrow(
        'Service Error: Cannot connect to API server'
      )
    })

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: { code: 'SERVER_ERROR', message: 'Server down' } }),
      })

      await expect(fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })).rejects.toThrow(
        'Server down'
      )
    })
  })

  describe('caching', () => {
    it('should cache successful results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ route: mockRoute }),
      })

      // First request - hits API
      await fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second request - should use cache
      const result = await fetchRoute({
        origin: 'Bangkok',
        destination: 'Chiang Mai',
      })
      expect(mockFetch).toHaveBeenCalledTimes(1) // No additional API call
      expect(result).toEqual(mockRoute)
    })

    it('should cache with normalized keys', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ route: mockRoute }),
      })

      // First request
      await fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })

      // Second request with different case/spacing - should use cache
      const result = await fetchRoute({
        origin: '  bangkok  ',
        destination: 'CHIANG   MAI',
      })
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockRoute)
    })

    it('should expire cache after TTL', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ route: mockRoute }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ route: mockRoute }),
        })

      // First request
      await fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance past TTL (60 seconds)
      vi.advanceTimersByTime(61000)

      // Second request - cache expired, should hit API again
      await fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should clear cache when clearRouteCache is called', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ route: mockRoute }),
      })

      await fetchRoute({ origin: 'Bangkok', destination: 'Chiang Mai' })
      expect(getRouteCacheStats().size).toBe(1)

      clearRouteCache()
      expect(getRouteCacheStats().size).toBe(0)
    })
  })

  describe('deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      let resolveRequest: (value: { route: Route }) => void
      const requestPromise = new Promise<{ route: Route }>(resolve => {
        resolveRequest = resolve
      })

      mockFetch.mockReturnValueOnce(
        requestPromise.then(() => ({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ route: mockRoute }),
        }))
      )

      // Start two identical requests concurrently
      const promise1 = fetchRoute({
        origin: 'Bangkok',
        destination: 'Chiang Mai',
      })
      const promise2 = fetchRoute({
        origin: 'Bangkok',
        destination: 'Chiang Mai',
      })

      // Resolve the fetch
      resolveRequest!({ route: mockRoute })

      // Both should resolve with the same result
      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(mockRoute)
      expect(result2).toEqual(mockRoute)

      // But only one API call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancellation', () => {
    it('should support AbortSignal for cancellation', async () => {
      const controller = new AbortController()

      // Create a fetch that rejects when aborted
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          if (controller.signal.aborted) {
            const error = new Error('AbortError')
            error.name = 'AbortError'
            reject(error)
          } else {
            controller.signal.addEventListener('abort', () => {
              const error = new Error('AbortError')
              error.name = 'AbortError'
              reject(error)
            })
          }
        })
      })

      const fetchPromise = fetchRoute(
        { origin: 'Bangkok', destination: 'Chiang Mai' },
        { signal: controller.signal }
      )

      // Cancel immediately
      controller.abort()

      await expect(fetchPromise).rejects.toThrow('AbortError')
    })

    it('should cancel specific route request', async () => {
      // Create a fetch that listens for abort
      mockFetch.mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          if (init?.signal?.aborted) {
            const error = new Error('AbortError')
            error.name = 'AbortError'
            reject(error)
          } else {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('AbortError')
              error.name = 'AbortError'
              reject(error)
            })
          }
        })
      })

      const fetchPromise = fetchRoute({
        origin: 'Bangkok',
        destination: 'Chiang Mai',
      })

      // Cancel the specific request
      cancelRouteRequest('Bangkok', 'Chiang Mai')

      await expect(fetchPromise).rejects.toThrow('AbortError')
    })

    it('should cancel all route requests', async () => {
      mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          if (init?.signal?.aborted) {
            const error = new Error('AbortError')
            error.name = 'AbortError'
            reject(error)
          } else {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('AbortError')
              error.name = 'AbortError'
              reject(error)
            })
          }
        })
      })

      const promise1 = fetchRoute({
        origin: 'Bangkok',
        destination: 'Chiang Mai',
      })
      const promise2 = fetchRoute({ origin: 'Phuket', destination: 'Krabi' })

      // Cancel all requests
      cancelAllRouteRequests()

      await expect(promise1).rejects.toThrow('AbortError')
      await expect(promise2).rejects.toThrow('AbortError')
    })
  })
})

describe('geocodeAddress', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  it('should geocode address successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          lat: '13.7563',
          lon: '100.5018',
          display_name: 'Bangkok, Thailand',
        },
      ],
    })

    const result = await geocodeAddress('Bangkok')

    expect(result).toEqual({
      lat: 13.7563,
      lng: 100.5018,
      address: 'Bangkok, Thailand',
    })
  })

  it('should return null on no results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    const result = await geocodeAddress('UnknownPlace12345')
    expect(result).toBeNull()
  })

  it('should return null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await geocodeAddress('Bangkok')
    expect(result).toBeNull()
  })
})
