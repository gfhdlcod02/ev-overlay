import { describe, it, expect } from 'vitest'
import { calculateSafeRange, isReachable } from './safe-range'
import type { EVParameters } from '../types'

describe('calculateSafeRange', () => {
  it('should calculate safe range for normal driving factor', () => {
    // Given: 70% charge, 20% reserve, 450km range, Normal factor (1.15)
    const params: EVParameters = {
      socNow: 70,
      range100Km: 450,
      reserveArrival: 20,
      factor: 1.15,
    }

    const result = calculateSafeRange(params)

    // Effective range: 450 / 1.15 = 391.3 km
    // Usable charge: 70 - 20 = 50%
    // Safe range: 391.3 * 0.5 = 195.65 km
    expect(result.effectiveRangeKm).toBeCloseTo(391.3, 1)
    expect(result.safeRangeKm).toBeCloseTo(195.65, 1)
    expect(result.bufferKm).toBe(10)
    expect(result.thresholdKm).toBeCloseTo(185.65, 1)
  })

  it('should calculate safe range for eco driving factor', () => {
    const params: EVParameters = {
      socNow: 80,
      range100Km: 400,
      reserveArrival: 15,
      factor: 1.05,
    }

    const result = calculateSafeRange(params)

    // Effective range: 400 / 1.05 = 380.95 km
    // Usable charge: 80 - 15 = 65%
    // Safe range: 380.95 * 0.65 = 247.62 km
    expect(result.effectiveRangeKm).toBeCloseTo(380.95, 1)
    expect(result.safeRangeKm).toBeCloseTo(247.62, 1)
  })

  it('should calculate safe range for highway driving factor', () => {
    const params: EVParameters = {
      socNow: 90,
      range100Km: 500,
      reserveArrival: 10,
      factor: 1.25,
    }

    const result = calculateSafeRange(params)

    // Effective range: 500 / 1.25 = 400 km
    // Usable charge: 90 - 10 = 80%
    // Safe range: 400 * 0.8 = 320 km
    expect(result.effectiveRangeKm).toBe(400)
    expect(result.safeRangeKm).toBe(320)
  })

  it('should handle edge case with zero reserve', () => {
    const params: EVParameters = {
      socNow: 100,
      range100Km: 300,
      reserveArrival: 0,
      factor: 1.0,
    }

    const result = calculateSafeRange(params)

    expect(result.safeRangeKm).toBe(300)
    expect(result.thresholdKm).toBe(290)
  })

  it('should handle edge case with minimal charge', () => {
    const params: EVParameters = {
      socNow: 25,
      range100Km: 400,
      reserveArrival: 20,
      factor: 1.15,
    }

    const result = calculateSafeRange(params)

    // Usable charge: 25 - 20 = 5%
    // Effective range: 400 / 1.15 = 347.8 km
    // Safe range: 347.8 * 0.05 = 17.4 km
    expect(result.safeRangeKm).toBeCloseTo(17.39, 1)
    expect(result.thresholdKm).toBeCloseTo(7.39, 1)
  })

  it('should never return negative threshold', () => {
    const params: EVParameters = {
      socNow: 21,
      range100Km: 100,
      reserveArrival: 20,
      factor: 1.15,
    }

    const result = calculateSafeRange(params)

    // Safe range is very small, buffer would make it negative
    expect(result.thresholdKm).toBeGreaterThanOrEqual(0)
  })
})

describe('isReachable', () => {
  it('should return true when safe range equals trip distance', () => {
    expect(isReachable(100, 100)).toBe(true)
  })

  it('should return true when safe range exceeds trip distance', () => {
    expect(isReachable(150, 100)).toBe(true)
  })

  it('should return false when safe range is less than trip distance', () => {
    expect(isReachable(80, 100)).toBe(false)
  })

  it('should handle zero distances', () => {
    expect(isReachable(0, 0)).toBe(true)
    expect(isReachable(0, 10)).toBe(false)
  })
})
