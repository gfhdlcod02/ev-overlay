import type { ChargingStop, SafeRange, EVParameters, Route } from '../types'
import { EVParameterDefaults } from '../types/ev-parameters'
import { accumulateDistance } from './distance-accumulator'

/**
 * Error thrown when charging stops cannot be calculated
 */
export class StopPlacementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StopPlacementError'
  }
}

/**
 * Calculate suggested charging stops along a route
 *
 * Algorithm:
 * 1. Accumulate route distance from origin
 * 2. When accumulated >= thresholdKm, place stop
 * 3. After stop, reset accumulated distance to 0
 * 4. Assume 80% charge for next leg calculation
 * 5. Repeat until destination reached
 * 6. Max 5 stops (error if more needed)
 *
 * @param route - Route with geometry
 * @param safeRange - Calculated safe range
 * @param evParams - Original EV parameters (for charge calculations)
 * @returns Array of charging stops (0-5)
 * @throws StopPlacementError if more than 5 stops needed
 */
export function calculateChargingStops(
  route: Route,
  safeRange: SafeRange,
  evParams: EVParameters
): ChargingStop[] {
  const { geometry, distanceKm } = route
  const { thresholdKm, effectiveRangeKm } = safeRange
  const maxStops = EVParameterDefaults.maxStops
  const chargeToPercent = EVParameterDefaults.chargeToPercent

  // If destination is within threshold, no stops needed
  if (distanceKm <= thresholdKm) {
    return []
  }

  // Accumulate distances along route
  const distances = accumulateDistance(geometry)
  const coordinates = geometry.coordinates

  const stops: ChargingStop[] = []
  let accumulatedKm = 0
  let lastStopDistanceKm = 0
  let lastStopChargePercent = evParams.socNow

  for (let i = 1; i < distances.length; i++) {
    const currentDistanceKm = distances[i]
    const segmentDistance = currentDistanceKm - distances[i - 1]
    accumulatedKm += segmentDistance

    // Check if we need a charging stop
    if (accumulatedKm >= thresholdKm && stops.length < maxStops) {
      // Calculate charge on arrival at this stop
      const chargeUsed = (accumulatedKm / effectiveRangeKm) * (lastStopChargePercent - evParams.reserveArrival)
      const arrivalCharge = Math.max(evParams.reserveArrival, lastStopChargePercent - chargeUsed)

      const stop: ChargingStop = {
        sequence: stops.length + 1,
        position: {
          lat: coordinates[i][1], // GeoJSON is [lng, lat], we use [lat, lng]
          lng: coordinates[i][0],
        },
        distanceFromStartKm: Math.round(currentDistanceKm * 100) / 100,
        arrivalChargePercent: Math.round(arrivalCharge * 10) / 10,
        chargeToPercent,
        distanceToNextKm: 0, // Will be calculated after next stop or destination
      }

      // Update previous stop's distanceToNext
      if (stops.length > 0) {
        const prevStop = stops[stops.length - 1]
        prevStop.distanceToNextKm = Math.round((currentDistanceKm - prevStop.distanceFromStartKm) * 100) / 100
      }

      stops.push(stop)

      // Reset for next leg (assume charging to 80%)
      accumulatedKm = 0
      lastStopDistanceKm = currentDistanceKm
      lastStopChargePercent = chargeToPercent
    }
  }

  // Check if we still can't reach destination
  const remainingToDestination = distanceKm - lastStopDistanceKm
  const lastLegSafeRange = ((lastStopChargePercent - evParams.reserveArrival) / 100) * effectiveRangeKm

  if (remainingToDestination > lastLegSafeRange - safeRange.bufferKm) {
    // Would need another stop but we've hit the max
    if (stops.length >= maxStops) {
      throw new StopPlacementError(
        `Route requires more than ${maxStops} charging stops. ` +
          `Consider increasing initial charge or reducing reserve threshold.`
      )
    }
  }

  // Update last stop's distance to destination
  if (stops.length > 0) {
    const lastStop = stops[stops.length - 1]
    lastStop.distanceToNextKm = Math.round((distanceKm - lastStop.distanceFromStartKm) * 100) / 100
  }

  return stops
}
