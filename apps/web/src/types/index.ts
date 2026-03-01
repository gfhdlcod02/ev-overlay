import type { EVParameters, DrivingFactor, Location, TripResult } from '@ev/core'

export interface TripInput {
  origin: string
  destination: string
  socNow: number | null
  range100Km: number | null
  reserveArrival: number
  drivingFactor: DrivingFactor
}

export interface MapState {
  center: [number, number]
  zoom: number
  bounds: L.LatLngBounds | null
}

export type RouteStatus = 'idle' | 'loading' | 'success' | 'error'

export interface RouteError {
  code: string
  message: string
}

export interface TripPlanningState {
  input: TripInput
  result: TripResult | null
  status: RouteStatus
  error: RouteError | null
}

export { type EVParameters, DrivingFactor, type Location, type TripResult }
