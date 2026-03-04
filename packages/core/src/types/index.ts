import type { EVParameters } from './ev-parameters'
import type { Route, SafeRange, ChargingStop, RouteSegment } from './route'

export type { EVParameters } from './ev-parameters'
export type { Route, SafeRange, ChargingStop, RouteSegment } from './route'

/**
 * Geographic coordinate
 */
export interface Location {
  lat: number
  lng: number
  address?: string
}

/**
 * GeoJSON LineString for route geometry
 */
export interface LineString {
  type: 'LineString'
  coordinates: [number, number][] // [lng, lat] pairs per GeoJSON spec
}

/**
 * Driving factor multipliers for consumption calculation
 */
export enum DrivingFactor {
  ECO = 1.05, // City driving, efficient speed
  NORMAL = 1.15, // Mixed driving
  HIGHWAY = 1.25, // High speed, HVAC usage
}

/**
 * Raw user input before validation
 */
export interface TripInput {
  origin: string
  destination: string
  socNow: number
  range100Km: number
  reserveArrival: number
  drivingFactor: DrivingFactor
}

/**
 * Complete trip planning result
 */
export interface TripResult {
  input: EVParameters
  route: Route
  safeRange: SafeRange
  stops: ChargingStop[]
  segments: RouteSegment[]
  googleMapsUrl: string
  totalDistanceKm: number
  totalDurationMin: number
  reachable: boolean
}
