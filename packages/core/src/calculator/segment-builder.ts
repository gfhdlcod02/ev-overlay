import type { RouteSegment, SafeRange, EVParameters, Route, ChargingStop } from '../types'
import { EVParameterDefaults } from '../types'
import { accumulateDistance } from './distance-accumulator'

// Color constants for segments
const SAFE_COLOR = '#22c55e' // green-500
const RISKY_COLOR = '#ef4444' // red-500

/**
 * Build route segments with safe/risky classification for visualization
 *
 * Segment Classification:
 * - Safe: endKm <= currentSafeRangeKm for current leg
 * - Risky: endKm > currentSafeRangeKm
 *
 * @param route - Route with geometry
 * @param safeRange - Calculated safe range
 * @param evParams - Original EV parameters
 * @param stops - Calculated charging stops
 * @returns Array of route segments with status and color
 */
export function buildRouteSegments(
  route: Route,
  safeRange: SafeRange,
  evParams: EVParameters,
  stops: ChargingStop[]
): RouteSegment[] {
  const { geometry } = route
  const { effectiveRangeKm, bufferKm } = safeRange
  const coordinates = geometry.coordinates

  // Accumulate distances
  const distances = accumulateDistance(geometry)

  const segments: RouteSegment[] = []
  let currentSafeRangeKm = safeRange.safeRangeKm
  let lastStopDistanceKm = 0
  let stopIndex = 0

  for (let i = 1; i < coordinates.length; i++) {
    const startKm = distances[i - 1]
    const endKm = distances[i]

    // Check if we've passed a charging stop
    if (stopIndex < stops.length && endKm > stops[stopIndex].distanceFromStartKm) {
      // Reset safe range after charging stop
      currentSafeRangeKm =
        ((EVParameterDefaults.chargeToPercent - evParams.reserveArrival) / 100) * effectiveRangeKm -
        bufferKm
      lastStopDistanceKm = stops[stopIndex].distanceFromStartKm
      stopIndex++
    }

    // Calculate distance from last stop (or origin)
    const distanceFromLastStop = endKm - lastStopDistanceKm

    // Determine status based on safe range
    const status: 'safe' | 'risky' = distanceFromLastStop <= currentSafeRangeKm ? 'safe' : 'risky'

    // Create segment
    const segment: RouteSegment = {
      startIdx: i - 1,
      endIdx: i,
      startKm: Math.round(startKm * 100) / 100,
      endKm: Math.round(endKm * 100) / 100,
      status,
      color: status === 'safe' ? SAFE_COLOR : RISKY_COLOR,
    }

    segments.push(segment)
  }

  return segments
}

/**
 * Get summary statistics for segments
 */
export function getSegmentStats(segments: RouteSegment[]): {
  safeKm: number
  riskyKm: number
  safePercent: number
  riskyPercent: number
} {
  if (segments.length === 0) {
    return { safeKm: 0, riskyKm: 0, safePercent: 0, riskyPercent: 0 }
  }

  let safeKm = 0
  let riskyKm = 0

  for (const segment of segments) {
    const segmentLength = segment.endKm - segment.startKm
    if (segment.status === 'safe') {
      safeKm += segmentLength
    } else {
      riskyKm += segmentLength
    }
  }

  const total = safeKm + riskyKm
  return {
    safeKm: Math.round(safeKm * 100) / 100,
    riskyKm: Math.round(riskyKm * 100) / 100,
    safePercent: Math.round((safeKm / total) * 1000) / 10,
    riskyPercent: Math.round((riskyKm / total) * 1000) / 10,
  }
}
