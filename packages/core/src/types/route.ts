import type { Location, LineString } from './index'

/**
 * Provider response with normalized geometry
 */
export interface Route {
  origin: Location
  destination: Location
  distanceKm: number
  durationMin: number
  geometry: LineString
}

/**
 * Calculated safe driving distance
 */
export interface SafeRange {
  /** Maximum safe distance: ((socNow - reserve)/100) * (range100 / factor) */
  safeRangeKm: number
  /** Range adjusted for driving factor: range100 / factor */
  effectiveRangeKm: number
  /** Safety buffer applied (default 10) */
  bufferKm: number
  /** Stop placement threshold: safeRangeKm - bufferKm */
  thresholdKm: number
}

/**
 * Suggested virtual charging location
 */
export interface ChargingStop {
  /** Stop order (1-based) */
  sequence: number
  /** Coordinate along route */
  position: Location
  /** Cumulative distance to this stop */
  distanceFromStartKm: number
  /** Estimated charge on arrival */
  arrivalChargePercent: number
  /** Assumed charge level after stop (default 80) */
  chargeToPercent: number
  /** Distance to next stop or destination */
  distanceToNextKm: number
}

/**
 * Portion of route with safety status for visualization
 */
export interface RouteSegment {
  /** Index into route geometry coordinates */
  startIdx: number
  /** Index into route geometry coordinates */
  endIdx: number
  /** Cumulative distance at segment start */
  startKm: number
  /** Cumulative distance at segment end */
  endKm: number
  /** Visual safety classification */
  status: 'safe' | 'risky'
  /** Hex color code (#22c55e safe, #ef4444 risky) */
  color: string
}
