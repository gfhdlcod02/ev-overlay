import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SearchCache, normalizeSearchKey } from './request-cache'

describe('SearchCache', () => {
  let cache: SearchCache<string>

  beforeEach(() => {
    cache = new SearchCache<string>()
    vi.useFakeTimers()
  })

  describe('get and set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should return undefined for expired entries', () => {
      cache.set('key1', 'value1')
      vi.advanceTimersByTime(61000) // Advance past 60s TTL
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should return value just before expiration', () => {
      cache.set('key1', 'value1')
      vi.advanceTimersByTime(59999) // Just before 60s
      expect(cache.get('key1')).toBe('value1')
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      const smallCache = new SearchCache<string>({ maxSize: 3 })

      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      smallCache.set('key3', 'value3')
      smallCache.set('key4', 'value4') // Should evict key1

      expect(smallCache.get('key1')).toBeUndefined()
      expect(smallCache.get('key2')).toBe('value2')
      expect(smallCache.get('key3')).toBe('value3')
      expect(smallCache.get('key4')).toBe('value4')
    })

    it('should refresh LRU position on get', () => {
      const smallCache = new SearchCache<string>({ maxSize: 3 })

      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      smallCache.set('key3', 'value3')

      // Access key1 to refresh its position
      smallCache.get('key1')

      // Add new key - should evict key2 (now oldest)
      smallCache.set('key4', 'value4')

      expect(smallCache.get('key1')).toBe('value1') // Still there
      expect(smallCache.get('key2')).toBeUndefined() // Evicted
      expect(smallCache.get('key3')).toBe('value3')
      expect(smallCache.get('key4')).toBe('value4')
    })

    it('should refresh LRU position on set (update)', () => {
      const smallCache = new SearchCache<string>({ maxSize: 3 })

      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      smallCache.set('key3', 'value3')

      // Update key1 to refresh its position
      smallCache.set('key1', 'updated')

      // Add new key - should evict key2 (now oldest)
      smallCache.set('key4', 'value4')

      expect(smallCache.get('key1')).toBe('updated')
      expect(smallCache.get('key2')).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.size()).toBe(0)
    })
  })

  describe('size', () => {
    it('should return current number of entries', () => {
      expect(cache.size()).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
    })
  })

  describe('custom TTL', () => {
    it('should use custom TTL', () => {
      const shortCache = new SearchCache<string>({ ttlMs: 1000 })
      shortCache.set('key1', 'value1')
      vi.advanceTimersByTime(999)
      expect(shortCache.get('key1')).toBe('value1')
      vi.advanceTimersByTime(2)
      expect(shortCache.get('key1')).toBeUndefined()
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const customCache = new SearchCache<string>({ maxSize: 100, ttlMs: 30000 })
      customCache.set('key1', 'value1')
      customCache.set('key2', 'value2')

      const stats = customCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(100)
      expect(stats.ttlMs).toBe(30000)
    })
  })
})

describe('normalizeSearchKey', () => {
  it('should normalize to lowercase', () => {
    expect(normalizeSearchKey('Bangkok', 'CHIANG MAI')).toBe('bangkok|chiang mai')
  })

  it('should trim whitespace', () => {
    expect(normalizeSearchKey('  Bangkok  ', '  Chiang Mai  ')).toBe('bangkok|chiang mai')
  })

  it('should collapse multiple spaces', () => {
    expect(normalizeSearchKey('Bangkok   Thailand', 'Chiang   Mai')).toBe(
      'bangkok thailand|chiang mai'
    )
  })

  it('should handle mixed case and whitespace', () => {
    expect(normalizeSearchKey('  BANGKOK   Thailand  ', '  chiang MAI  ')).toBe(
      'bangkok thailand|chiang mai'
    )
  })

  it('should handle empty strings', () => {
    expect(normalizeSearchKey('', '')).toBe('|')
  })
})
