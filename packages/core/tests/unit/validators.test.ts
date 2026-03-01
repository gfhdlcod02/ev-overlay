import { describe, it, expect } from 'vitest'
import {
  validateCoordinate,
  validateLocation,
  validateRange,
  combineValidations,
} from '../../src/validators'
import { validateEVParameters, normalizeEVParameters } from '../../src/validators/ev-validation'
import type { Location } from '../../src/types'

describe('validateCoordinate', () => {
  it('should validate valid coordinates', () => {
    const result = validateCoordinate(37.7749, -122.4194)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject latitude out of bounds', () => {
    const result = validateCoordinate(91, 0)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Latitude must be between -90 and 90')
  })

  it('should reject longitude out of bounds', () => {
    const result = validateCoordinate(0, 181)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Longitude must be between -180 and 180')
  })

  it('should reject non-numeric values', () => {
    const result = validateCoordinate(NaN, 0)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Latitude must be a valid number')
  })

  it('should reject non-finite values', () => {
    const result = validateCoordinate(Infinity, 0)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Latitude must be a valid number')
  })
})

describe('validateLocation', () => {
  it('should validate a valid location', () => {
    const location: Location = { lat: 37.7749, lng: -122.4194 }
    const result = validateLocation(location)
    expect(result.valid).toBe(true)
  })

  it('should validate location with address', () => {
    const location: Location = { lat: 37.7749, lng: -122.4194, address: 'San Francisco' }
    const result = validateLocation(location)
    expect(result.valid).toBe(true)
  })
})

describe('validateRange', () => {
  it('should validate value within range', () => {
    const result = validateRange(50, 0, 100, 'Test field')
    expect(result.valid).toBe(true)
  })

  it('should reject value below minimum', () => {
    const result = validateRange(-1, 0, 100, 'Test field')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toBe('Test field must be at least 0')
  })

  it('should reject value above maximum', () => {
    const result = validateRange(101, 0, 100, 'Test field')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toBe('Test field must be at most 100')
  })

  it('should reject non-numeric values', () => {
    const result = validateRange(NaN, 0, 100, 'Test field')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toBe('Test field must be a valid number')
  })
})

describe('combineValidations', () => {
  it('should combine valid results', () => {
    const result = combineValidations(
      { valid: true, errors: [] },
      { valid: true, errors: [] }
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should combine errors from invalid results', () => {
    const result = combineValidations(
      { valid: false, errors: ['Error 1'] },
      { valid: false, errors: ['Error 2'] }
    )
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors).toContain('Error 1')
    expect(result.errors).toContain('Error 2')
  })
})

describe('validateEVParameters', () => {
  it('should validate complete valid parameters', () => {
    const params = {
      socNow: 70,
      range100Km: 450,
      reserveArrival: 20,
      factor: 1.15,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should require socNow', () => {
    const params = {
      range100Km: 450,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('State of charge (socNow) is required')
  })

  it('should require range100Km', () => {
    const params = {
      socNow: 70,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Vehicle range (range100Km) is required')
  })

  it('should reject socNow outside 0-100 range', () => {
    const params = {
      socNow: 101,
      range100Km: 450,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('State of charge must be at most 100')
  })

  it('should reject range100Km below minimum', () => {
    const params = {
      socNow: 70,
      range100Km: 0.01,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Vehicle range must be at least 0.1')
  })

  it('should reject when socNow <= reserveArrival', () => {
    const params = {
      socNow: 20,
      range100Km: 450,
      reserveArrival: 20,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Current charge must be greater than reserve arrival charge')
  })

  it('should reject invalid factor', () => {
    const params = {
      socNow: 70,
      range100Km: 450,
      factor: 0.5,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Driving factor must be at least 1')
  })

  it('should validate with defaults (optional fields)', () => {
    const params = {
      socNow: 70,
      range100Km: 450,
    }
    const result = validateEVParameters(params)
    expect(result.valid).toBe(true)
  })
})

describe('normalizeEVParameters', () => {
  it('should apply defaults for missing optional fields', () => {
    const input = {
      socNow: 70,
      range100Km: 450,
    }
    const result = normalizeEVParameters(input)
    expect(result.reserveArrival).toBe(20)
    expect(result.factor).toBe(1.15)
  })

  it('should preserve provided values', () => {
    const input = {
      socNow: 80,
      range100Km: 500,
      reserveArrival: 10,
      factor: 1.25,
    }
    const result = normalizeEVParameters(input)
    expect(result.socNow).toBe(80)
    expect(result.range100Km).toBe(500)
    expect(result.reserveArrival).toBe(10)
    expect(result.factor).toBe(1.25)
  })
})
