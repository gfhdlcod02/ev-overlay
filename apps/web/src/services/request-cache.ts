import type { CacheEntry, CacheConfig } from '@/types'

/**
 * LRU Cache with TTL expiration
 * Uses Map to preserve insertion order for LRU eviction
 */
export class SearchCache<T> {
  private cache: Map<string, CacheEntry<T>>
  private maxSize: number
  private ttlMs: number

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map()
    this.maxSize = config.maxSize ?? 50
    this.ttlMs = config.ttlMs ?? 60000 // 60 seconds default
  }

  /**
   * Get cached value if it exists and hasn't expired
   * Also refreshes the LRU position (moves to end)
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return undefined
    }

    // Refresh LRU position: delete and re-add to move to end
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.result
  }

  /**
   * Set cached value
   * If at capacity, evicts oldest entry (LRU)
   */
  set(key: string, value: T): void {
    // If key exists, delete it first to refresh position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      result: value,
      timestamp: Date.now(),
    })
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get current number of cached entries
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    }
  }
}

/**
 * Normalize search key for cache lookup
 * Converts to lowercase, trims whitespace, collapses multiple spaces
 */
export function normalizeSearchKey(origin: string, destination: string): string {
  const normalize = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, ' ')
  return `${normalize(origin)}|${normalize(destination)}`
}
