import type { EVParameters, SafeRange } from '../types'
import { EVParameterDefaults } from '../types'

/**
 * Calculate safe driving range based on EV parameters
 *
 * Formula: safeRangeKm = ((socNow - reserveArrival) / 100) * (range100Km / factor)
 *
 * @param params - Validated EV parameters
 * @returns SafeRange with safeRangeKm, effectiveRangeKm, bufferKm, thresholdKm
 */
export function calculateSafeRange(params: EVParameters): SafeRange {
  const { socNow, range100Km, reserveArrival, factor } = params

  // Calculate effective range adjusted for driving factor
  const effectiveRangeKm = range100Km / factor

  // Calculate usable charge percentage
  const usableChargePercent = socNow - reserveArrival

  // Calculate safe range based on usable charge
  const safeRangeKm = (usableChargePercent / 100) * effectiveRangeKm

  // Apply buffer for stop placement threshold
  const bufferKm = EVParameterDefaults.bufferKm
  const thresholdKm = Math.max(0, safeRangeKm - bufferKm)

  return {
    safeRangeKm: Math.round(safeRangeKm * 100) / 100, // Round to 2 decimals
    effectiveRangeKm: Math.round(effectiveRangeKm * 100) / 100,
    bufferKm,
    thresholdKm: Math.round(thresholdKm * 100) / 100,
  }
}

/**
 * Check if destination is reachable with current charge
 *
 * @param safeRangeKm - Calculated safe range
 * @param tripDistanceKm - Total trip distance
 * @returns true if reachable
 */
export function isReachable(safeRangeKm: number, tripDistanceKm: number): boolean {
  return safeRangeKm >= tripDistanceKm
}
