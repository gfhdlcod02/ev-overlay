import { describe, it, expect } from 'vitest'
import {
  validateLatitude,
  validateLongitude,
  validateSoC,
  validatePower,
  validateRouteRequest,
  validateStationsQuery,
  buildSafeUrl,
  sanitizeString,
} from './validation'

describe('Input Validation', () => {
  describe('validateLatitude', () => {
    it('should accept valid latitude', () => {
      expect(validateLatitude(0)).toEqual({ valid: true })
      expect(validateLatitude(45)).toEqual({ valid: true })
      expect(validateLatitude(-90)).toEqual({ valid: true })
      expect(validateLatitude(90)).toEqual({ valid: true })
    })

    it('should reject out-of-bounds latitude', () => {
      expect(validateLatitude(-91)).toEqual({
        valid: false,
        error: 'Latitude must be between -90 and 90',
      })
      expect(validateLatitude(91)).toEqual({
        valid: false,
        error: 'Latitude must be between -90 and 90',
      })
    })

    it('should reject non-numeric latitude', () => {
      expect(validateLatitude('invalid')).toEqual({
        valid: false,
        error: 'Latitude must be a number',
      })
      expect(validateLatitude(NaN)).toEqual({
        valid: false,
        error: 'Latitude must be a number',
      })
    })
  })

  describe('validateLongitude', () => {
    it('should accept valid longitude', () => {
      expect(validateLongitude(0)).toEqual({ valid: true })
      expect(validateLongitude(100)).toEqual({ valid: true })
      expect(validateLongitude(-180)).toEqual({ valid: true })
      expect(validateLongitude(180)).toEqual({ valid: true })
    })

    it('should reject out-of-bounds longitude', () => {
      expect(validateLongitude(-181)).toEqual({
        valid: false,
        error: 'Longitude must be between -180 and 180',
      })
      expect(validateLongitude(181)).toEqual({
        valid: false,
        error: 'Longitude must be between -180 and 180',
      })
    })
  })

  describe('validateSoC', () => {
    it('should accept valid SoC values', () => {
      expect(validateSoC(0)).toEqual({ valid: true })
      expect(validateSoC(50)).toEqual({ valid: true })
      expect(validateSoC(100)).toEqual({ valid: true })
    })

    it('should reject out-of-bounds SoC', () => {
      expect(validateSoC(-1)).toEqual({
        valid: false,
        error: 'SoC must be between 0 and 100',
      })
      expect(validateSoC(101)).toEqual({
        valid: false,
        error: 'SoC must be between 0 and 100',
      })
    })
  })

  describe('validatePower', () => {
    it('should accept valid power values', () => {
      expect(validatePower(1)).toEqual({ valid: true })
      expect(validatePower(350)).toEqual({ valid: true })
      expect(validatePower(1000)).toEqual({ valid: true })
    })

    it('should reject non-positive power', () => {
      expect(validatePower(0)).toEqual({
        valid: false,
        error: 'Power must be greater than 0',
      })
      expect(validatePower(-10)).toEqual({
        valid: false,
        error: 'Power must be greater than 0',
      })
    })

    it('should reject excessive power', () => {
      expect(validatePower(1001)).toEqual({
        valid: false,
        error: 'Power must not exceed 1000 kW',
      })
    })
  })

  describe('validateRouteRequest', () => {
    it('should accept valid route request', () => {
      const request = {
        origin: { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
        destination: { lat: 18.7883, lng: 98.9853, name: 'Chiang Mai' },
        vehicle: {
          batteryCapacityKwh: 77,
          rangeKmAt100Percent: 450,
          currentSocPercent: 80,
          reserveSocPercent: 20,
        },
      }
      expect(validateRouteRequest(request)).toEqual({ valid: true })
    })

    it('should reject missing origin', () => {
      const request = {
        destination: { lat: 18.7883, lng: 98.9853 },
        vehicle: { currentSocPercent: 80 },
      }
      const result = validateRouteRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Origin is required')
    })

    it('should reject invalid coordinates', () => {
      const request = {
        origin: { lat: 91, lng: 100 },
        destination: { lat: 18.7883, lng: 98.9853 },
        vehicle: { currentSocPercent: 80 },
      }
      const result = validateRouteRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes('Latitude'))).toBe(true)
    })

    it('should reject invalid SoC', () => {
      const request = {
        origin: { lat: 13.7563, lng: 100.5018 },
        destination: { lat: 18.7883, lng: 98.9853 },
        vehicle: { currentSocPercent: 150 },
      }
      const result = validateRouteRequest(request)
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes('SoC'))).toBe(true)
    })
  })

  describe('validateStationsQuery', () => {
    it('should accept valid bounding box', () => {
      const params = {
        lat1: '13.0',
        lng1: '100.0',
        lat2: '14.0',
        lng2: '101.0',
      }
      expect(validateStationsQuery(params)).toEqual({ valid: true })
    })

    it('should reject invalid coordinates', () => {
      const params = {
        lat1: 'invalid',
        lng1: '100.0',
        lat2: '14.0',
        lng2: '101.0',
      }
      const result = validateStationsQuery(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('lat1 must be a valid number')
    })

    it('should reject out-of-range limit', () => {
      const params = {
        lat1: '13.0',
        lng1: '100.0',
        lat2: '14.0',
        lng2: '101.0',
        limit: '1000',
      }
      const result = validateStationsQuery(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('limit must be between 1 and 500')
    })
  })

  describe('buildSafeUrl', () => {
    it('should properly encode URL parameters', () => {
      const url = buildSafeUrl('https://api.example.com/search', {
        q: 'hello world',
        special: 'a&b=c',
      })
      expect(url).toBe('https://api.example.com/search?q=hello+world&special=a%26b%3Dc')
    })

    it('should handle numeric parameters', () => {
      const url = buildSafeUrl('https://api.example.com/route', {
        lat: 13.7563,
        lng: 100.5018,
      })
      expect(url).toContain('lat=13.7563')
      expect(url).toContain('lng=100.5018')
    })
  })

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld')
      expect(sanitizeString('test\x1fend')).toBe('testend')
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello')
    })

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000)
      expect(sanitizeString(longString).length).toBe(1000)
    })
  })
})
