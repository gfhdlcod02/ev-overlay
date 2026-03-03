import { describe, it, expect } from 'vitest'
import {
  isValidLatitude,
  isValidLongitude,
  isValidAccuracy,
  isValidCoordinate,
  isAccuracyAcceptable,
  THAILAND_DEFAULT,
  USER_LOCATION_ZOOM,
  FLY_TO_DURATION_SECS,
  GEOLOCATION_TIMEOUT,
  STORAGE_KEY,
  formatCoordinate,
  formatCoordinatePair,
} from './coordinates'

describe('coordinates', () => {
  describe('isValidLatitude', () => {
    it('should return true for valid latitudes', () => {
      expect(isValidLatitude(0)).toBe(true)
      expect(isValidLatitude(45)).toBe(true)
      expect(isValidLatitude(-45)).toBe(true)
      expect(isValidLatitude(90)).toBe(true)
      expect(isValidLatitude(-90)).toBe(true)
    })

    it('should return false for invalid latitudes', () => {
      expect(isValidLatitude(91)).toBe(false)
      expect(isValidLatitude(-91)).toBe(false)
      expect(isValidLatitude(NaN)).toBe(false)
      expect(isValidLatitude(Infinity)).toBe(false)
    })
  })

  describe('isValidLongitude', () => {
    it('should return true for valid longitudes', () => {
      expect(isValidLongitude(0)).toBe(true)
      expect(isValidLongitude(100)).toBe(true)
      expect(isValidLongitude(-100)).toBe(true)
      expect(isValidLongitude(180)).toBe(true)
      expect(isValidLongitude(-180)).toBe(true)
    })

    it('should return false for invalid longitudes', () => {
      expect(isValidLongitude(181)).toBe(false)
      expect(isValidLongitude(-181)).toBe(false)
      expect(isValidLongitude(NaN)).toBe(false)
      expect(isValidLongitude(Infinity)).toBe(false)
    })
  })

  describe('isValidAccuracy', () => {
    it('should return true for valid accuracy values', () => {
      expect(isValidAccuracy(0)).toBe(true)
      expect(isValidAccuracy(100)).toBe(true)
      expect(isValidAccuracy(1000)).toBe(true)
    })

    it('should return false for invalid accuracy values', () => {
      expect(isValidAccuracy(-1)).toBe(false)
      expect(isValidAccuracy(NaN)).toBe(false)
    })
  })

  describe('isValidCoordinate', () => {
    it('should return true for valid coordinates', () => {
      expect(isValidCoordinate(13.7563, 100.5018)).toBe(true)
      expect(isValidCoordinate(37.7749, -122.4194, 100)).toBe(true)
    })

    it('should return false for invalid coordinates', () => {
      expect(isValidCoordinate(91, 100)).toBe(false)
      expect(isValidCoordinate(13, 181)).toBe(false)
      expect(isValidCoordinate(13, 100, -1)).toBe(false)
    })
  })

  describe('isAccuracyAcceptable', () => {
    it('should return true for acceptable accuracy', () => {
      expect(isAccuracyAcceptable(0)).toBe(true)
      expect(isAccuracyAcceptable(500)).toBe(true)
      expect(isAccuracyAcceptable(1000)).toBe(true)
    })

    it('should return false for unacceptable accuracy', () => {
      expect(isAccuracyAcceptable(1001)).toBe(false)
      expect(isAccuracyAcceptable(5000)).toBe(false)
    })

    it('should respect custom threshold', () => {
      expect(isAccuracyAcceptable(1500, 2000)).toBe(true)
      expect(isAccuracyAcceptable(500, 200)).toBe(false)
    })
  })

  describe('constants', () => {
    it('should have correct Thailand default values', () => {
      expect(THAILAND_DEFAULT.center).toEqual([13.7563, 100.5018])
      expect(THAILAND_DEFAULT.zoom).toBe(6)
    })

    it('should have correct user location zoom', () => {
      expect(USER_LOCATION_ZOOM).toBe(13)
    })

    it('should have correct fly to duration', () => {
      expect(FLY_TO_DURATION_SECS).toBe(1.5)
    })

    it('should have correct geolocation timeout', () => {
      expect(GEOLOCATION_TIMEOUT).toBe(5000)
    })

    it('should have correct storage key', () => {
      expect(STORAGE_KEY).toBe('ev-overlay:location')
    })
  })

  describe('formatCoordinate', () => {
    it('should format coordinate with dot decimal separator', () => {
      expect(formatCoordinate(13.7563)).toBe('13.756300')
      expect(formatCoordinate(100.5018)).toBe('100.501800')
      expect(formatCoordinate(-33.8688)).toBe('-33.868800')
    })

    it('should format with custom decimal places', () => {
      expect(formatCoordinate(13.7563, 2)).toBe('13.76')
      expect(formatCoordinate(13.7563, 4)).toBe('13.7563')
    })

    it('should handle zero correctly', () => {
      expect(formatCoordinate(0)).toBe('0.000000')
      expect(formatCoordinate(0, 2)).toBe('0.00')
    })

    it('should handle integers correctly', () => {
      expect(formatCoordinate(13)).toBe('13.000000')
      expect(formatCoordinate(100)).toBe('100.000000')
    })

    it('should always use dot as decimal separator', () => {
      // This test ensures consistency across all locales
      const result = formatCoordinate(13.7563)
      expect(result).toContain('.')
      expect(result).not.toContain(',')
    })
  })

  describe('formatCoordinatePair', () => {
    it('should format lat,lng pair correctly', () => {
      expect(formatCoordinatePair(13.7563, 100.5018)).toBe('13.756300,100.501800')
      expect(formatCoordinatePair(-33.8688, 151.2093)).toBe('-33.868800,151.209300')
    })

    it('should use comma as separator between coordinates', () => {
      const result = formatCoordinatePair(13.7563, 100.5018)
      // Should have exactly one comma (the separator)
      expect(result.split(',').length).toBe(2)
      // Both parts should have dots as decimal separators
      const parts = result.split(',')
      expect(parts[0]).toContain('.')
      expect(parts[1]).toContain('.')
    })

    it('should handle negative coordinates correctly', () => {
      expect(formatCoordinatePair(-90, -180)).toBe('-90.000000,-180.000000')
      expect(formatCoordinatePair(-33.8688, 151.2093)).toBe('-33.868800,151.209300')
    })

    it('should handle zero coordinates correctly', () => {
      expect(formatCoordinatePair(0, 0)).toBe('0.000000,0.000000')
    })
  })
})
