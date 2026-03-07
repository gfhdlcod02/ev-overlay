import type { KVNamespace } from '@cloudflare/workers-types';
import type { CachedStationQuery, CompactStation, StationDetail } from '../types';

/**
 * Station Cache Manager
 *
 * Caches station queries and individual stations in KV.
 * TTL: 1 hour (3600 seconds)
 */

const CACHE_VERSION = 1;
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

export interface StationQueryKey {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

export class StationCache {
  constructor(
    private kv: KVNamespace,
    private ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {}

  /**
   * Generate cache key for bbox query
   */
  static generateBboxKey(bbox: StationQueryKey): string {
    const normalize = (n: number) => n.toFixed(6);
    return `stations:bbox:${normalize(bbox.lat1)},${normalize(bbox.lng1)},${normalize(bbox.lat2)},${normalize(bbox.lng2)}`;
  }

  /**
   * Generate cache key for single station
   */
  static generateStationKey(stationId: number): string {
    return `station:${stationId}`;
  }

  /**
   * Get cached station query
   */
  async getQuery(bbox: StationQueryKey): Promise<CachedStationQuery | null> {
    const key = StationCache.generateBboxKey(bbox);

    try {
      const cached = await this.kv.get(key, 'json');

      if (!cached) {
        return null;
      }

      const query = cached as CachedStationQuery;

      // Version check
      if (query.version !== CACHE_VERSION) {
        await this.kv.delete(key);
        return null;
      }

      return query;
    } catch (error) {
      console.error('Station cache get error:', error);
      return null;
    }
  }

  /**
   * Store station query in cache
   */
  async setQuery(
    bbox: StationQueryKey,
    stations: CompactStation[],
    totalCount: number
  ): Promise<void> {
    const key = StationCache.generateBboxKey(bbox);

    try {
      const cachedQuery: CachedStationQuery = {
        version: CACHE_VERSION,
        bbox: [bbox.lat1, bbox.lng1, bbox.lat2, bbox.lng2],
        stations,
        totalCount,
        cachedAt: new Date().toISOString()
      };

      await this.kv.put(key, JSON.stringify(cachedQuery), {
        expirationTtl: this.ttlSeconds
      });
    } catch (error) {
      console.error('Station cache set error:', error);
    }
  }

  /**
   * Get cached single station
   */
  async getStation(stationId: number): Promise<StationDetail | null> {
    const key = StationCache.generateStationKey(stationId);

    try {
      const cached = await this.kv.get(key, 'json');
      return cached as StationDetail | null;
    } catch (error) {
      console.error('Station cache get error:', error);
      return null;
    }
  }

  /**
   * Store single station in cache
   */
  async setStation(station: StationDetail): Promise<void> {
    const key = StationCache.generateStationKey(station.id);

    try {
      await this.kv.put(key, JSON.stringify(station), {
        expirationTtl: this.ttlSeconds
      });
    } catch (error) {
      console.error('Station cache set error:', error);
    }
  }

  /**
   * Invalidate station query caches
   */
  async invalidateQueries(): Promise<void> {
    // KV doesn't support pattern delete, so we rely on TTL expiration
    // For explicit invalidation, we'd need to track keys or use a different approach
    console.log('Station query caches will expire via TTL');
  }

  /**
   * Invalidate single station cache
   */
  async invalidateStation(stationId: number): Promise<void> {
    const key = StationCache.generateStationKey(stationId);

    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error('Station cache invalidate error:', error);
    }
  }

  /**
   * Invalidate multiple stations
   */
  async invalidateStations(stationIds: number[]): Promise<void> {
    await Promise.all(stationIds.map(id => this.invalidateStation(id)));
  }
}

/**
 * Create station cache instance from environment
 */
export function createStationCache(
  kv: KVNamespace,
  ttlSeconds?: number
): StationCache {
  return new StationCache(kv, ttlSeconds);
}
