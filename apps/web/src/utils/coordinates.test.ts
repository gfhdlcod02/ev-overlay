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
})
