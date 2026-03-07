import type { KVNamespace } from '@cloudflare/workers-types';
import type { CachedRoute, RouteRequest } from '../types';

/**
 * Route Cache Manager
 *
 * Caches route calculations in KV for fast retrieval.
 * TTL: 7 days (604800 seconds)
 */

const CACHE_VERSION = 1;
const DEFAULT_TTL_SECONDS = 604800; // 7 days

export interface CacheKeyParts {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  batteryCapacity: number;
  currentSoc: number;
  reserveSoc: number;
}

export class RouteCache {
  constructor(
    private kv: KVNamespace,
    private ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {}

  /**
   * Generate cache key from route parameters
   */
  static generateKey(parts: CacheKeyParts): string {
    // Normalize coordinates to 6 decimal places for consistent keys
    const normalize = (n: number) => n.toFixed(6);

    const keyParts = [
      'route',
      normalize(parts.originLat),
      normalize(parts.originLng),
      normalize(parts.destLat),
      normalize(parts.destLng),
      parts.batteryCapacity.toFixed(1),
      Math.round(parts.currentSoc),
      Math.round(parts.reserveSoc)
    ];

    return keyParts.join(':');
  }

  /**
   * Extract cache key parts from route request
   */
  static extractKeyParts(request: RouteRequest): CacheKeyParts {
    return {
      originLat: request.origin.lat,
      originLng: request.origin.lng,
      destLat: request.destination.lat,
      destLng: request.destination.lng,
      batteryCapacity: request.vehicle.batteryCapacityKwh,
      currentSoc: request.vehicle.currentSocPercent,
      reserveSoc: request.vehicle.reserveSocPercent ?? 20
    };
  }

  /**
   * Get cached route
   */
  async get(key: string): Promise<CachedRoute | null> {
    try {
      const cached = await this.kv.get(key, 'json');

      if (!cached) {
        return null;
      }

      const route = cached as CachedRoute;

      // Version check for cache invalidation on schema changes
      if (route.version !== CACHE_VERSION) {
        await this.kv.delete(key);
        return null;
      }

      // Expiration check
      if (new Date(route.expiresAt) < new Date()) {
        await this.kv.delete(key);
        return null;
      }

      return route;
    } catch (error) {
      console.error('Route cache get error:', error);
      return null;
    }
  }

  /**
   * Store route in cache
   */
  async set(key: string, route: Omit<CachedRoute, 'version' | 'cachedAt' | 'expiresAt'>): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

      const cachedRoute: CachedRoute = {
        ...route,
        version: CACHE_VERSION,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await this.kv.put(key, JSON.stringify(cachedRoute), {
        expirationTtl: this.ttlSeconds
      });
    } catch (error) {
      console.error('Route cache set error:', error);
      // Non-fatal: continue without caching
    }
  }

  /**
   * Delete cached route
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error('Route cache delete error:', error);
    }
  }

  /**
   * Check if route exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const route = await this.get(key);
    return route !== null;
  }

  /**
   * Get cache metadata (for debugging/monitoring)
   */
  async getMetadata(key: string): Promise<{ ttl: number; expiration: number } | null> {
    try {
      const metadata = await this.kv.getWithMetadata(key);
      if (!metadata.metadata) {
        return null;
      }
      return {
        ttl: (metadata.metadata as { expiration: number }).expiration - Math.floor(Date.now() / 1000),
        expiration: (metadata.metadata as { expiration: number }).expiration
      };
    } catch {
      return null;
    }
  }
}

/**
 * Create route cache instance from environment
 */
export function createRouteCache(
  kv: KVNamespace,
  ttlSeconds?: number
): RouteCache {
  return new RouteCache(kv, ttlSeconds);
}
