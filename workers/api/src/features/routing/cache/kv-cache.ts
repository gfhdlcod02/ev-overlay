import type { Route } from '@ev/core'
import { CACHE_CONFIG } from '@/config'

const CACHE_TTL_SECONDS = CACHE_CONFIG.TTL_SECONDS
const CACHE_PREFIX = CACHE_CONFIG.KEY_PREFIX

export interface CacheEntry {
  route: Route
  timestamp: number
}

/**
 * Generate cache key from origin and destination
 * Uses first 8 chars of SHA-256 hash of coordinate string
 */
export async function generateCacheKey(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<string> {
  // Round to configured decimal places (~11m precision for 4 decimals) for cache key
  const precision = CACHE_CONFIG.COORDINATE_PRECISION
  const originStr = `${origin.lat.toFixed(precision)},${origin.lng.toFixed(precision)}`
  const destStr = `${destination.lat.toFixed(precision)},${destination.lng.toFixed(precision)}`

  const originHash = await hashString(originStr)
  const destHash = await hashString(destStr)

  return `${CACHE_PREFIX}${originHash}:${destHash}`
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.slice(0, 8)
}

/**
 * Get cached route from KV
 */
export async function getCachedRoute(kv: KVNamespace, key: string): Promise<Route | null> {
  try {
    const entry = await kv.get<CacheEntry>(key, 'json')

    if (!entry) {
      return null
    }

    // Check if entry is still valid (KV TTL handles this, but double-check)
    const age = Date.now() - entry.timestamp
    if (age > CACHE_TTL_SECONDS * 1000) {
      return null
    }

    return entry.route
  } catch (e) {
    console.error('Cache get error:', e instanceof Error ? e.message : 'Unknown error')
    return null
  }
}

/**
 * Cache route in KV with TTL
 */
export async function cacheRoute(kv: KVNamespace, key: string, route: Route): Promise<void> {
  try {
    const entry: CacheEntry = {
      route,
      timestamp: Date.now(),
    }

    await kv.put(key, JSON.stringify(entry), {
      expirationTtl: CACHE_TTL_SECONDS,
    })
  } catch (e) {
    console.error('Cache put error:', e instanceof Error ? e.message : 'Unknown error')
    // Don't throw - caching is best-effort
  }
}
