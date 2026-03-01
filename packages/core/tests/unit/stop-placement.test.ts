import { describe, it, expect } from 'vitest'
import { calculateChargingStops, StopPlacementError } from '../../src/calculator/stop-placement'
import type { EVParameters, Route, SafeRange } from '../../src/types'

describe('calculateChargingStops', () => {
  // Helper to create a simple route
  function createRoute(distanceKm: number): Route {
    // Create a straight line route going east from 0,0
    const numPoints = Math.max(2, Math.ceil(distanceKm / 10))
    const coordinates: [number, number][] = []

    for (let i = 0; i < numPoints; i++) {
      const fraction = i / (numPoints - 1)
      // Roughly 111km per degree of longitude at equator
      coordinates.push([fraction * (distanceKm / 111), 0])
    }

    return {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: coordinates[coordinates.length - 1][0] },
      distanceKm,
      durationMin: distanceKm * 0.6, // Rough estimate
      geometry: {
        type: 'LineString',
        coordinates,
      },
    }
  }

  it('should return empty array when destination is within safe range', () => {
    const route = createRoute(100)
    const safeRange: SafeRange = {
      safeRangeKm: 150,
      effectiveRangeKm: 300,
      bufferKm: 10,
      thresholdKm: 140,
    }
    const evParams: EVParameters = {
      socNow: 70,
      range100Km: 400,
      reserveArrival: 20,
      factor: 1.15,
    }

    const stops = calculateChargingStops(route, safeRange, evParams)
    expect(stops).toHaveLength(0)
  })

  it('should place one stop for a route requiring one charge', () => {
    const route = createRoute(300)
    const safeRange: SafeRange = {
      safeRangeKm: 150,
      effectiveRangeKm: 300,
      bufferKm: 10,
      thresholdKm: 140,
    }
    const evParams: EVParameters = {
      socNow: 70,
      range100Km: 400,
      reserveArrival: 20,
      factor: 1.15,
    }

    const stops = calculateChargingStops(route, safeRange, evParams)
    expect(stops.length).toBeGreaterThanOrEqual(1)
    expect(stops[0].sequence).toBe(1)
    expect(stops[stops.length - 1].distanceToNextKm).toBeGreaterThan(0)
  })

  it('should place multiple stops for a long route', () => {
    const route = createRoute(800)
    const safeRange: SafeRange = {
      safeRangeKm: 150,
      effectiveRangeKm: 300,
      bufferKm: 10,
      thresholdKm: 140,
    }
    const evParams: EVParameters = {
      socNow: 80,
      range100Km: 400,
      reserveArrival: 20,
      factor: 1.15,
    }

    const stops = calculateChargingStops(route, safeRange, evParams)
    expect(stops.length).toBeGreaterThan(1)
    // Each stop should have increasing sequence numbers
    stops.forEach((stop, idx) => {
      expect(stop.sequence).toBe(idx + 1)
    })
  })

  it('should set chargeToPercent to 80 for all stops', () => {
    const route = createRoute(400)
    const safeRange: SafeRange = {
      safeRangeKm: 100,
      effectiveRangeKm: 250,
      bufferKm: 10,
      thresholdKm: 90,
    }
    const evParams: EVParameters = {
      socNow: 70,
      range100Km: 400,
      reserveArrival: 20,
      factor: 1.15,
    }

    const stops = calculateChargingStops(route, safeRange, evParams)
    stops.forEach(stop => {
      expect(stop.chargeToPercent).toBe(80)
    })
  })

  it('should calculate arrival charge correctly', () => {
    const route = createRoute(300)
    const safeRange: SafeRange = {
      safeRangeKm: 150,
      effectiveRangeKm: 300,
      bufferKm: 10,
      thresholdKm: 140,
    }
    const evParams: EVParameters = {
      socNow: 70,
      range100Km: 400,
      reserveArrival: 20,
      factor: 1.15,
    }

    const stops = calculateChargingStops(route, safeRange, evParams)
    expect(stops.length).toBeGreaterThanOrEqual(1)

    // Arrival charge should be between reserve and 80
    stops.forEach(stop => {
      expect(stop.arrivalChargePercent).toBeGreaterThanOrEqual(evParams.reserveArrival)
      expect(stop.arrivalChargePercent).toBeLessThanOrEqual(80)
    })
  })

  it('should throw error when more than 5 stops needed', () => {
    const route = createRoute(1000)
    const safeRange: SafeRange = {
      safeRangeKm: 100,
      effectiveRangeKm: 200,
      bufferKm: 10,
      thresholdKm: 90,
    }
    const evParams: EVParameters = {
      socNow: 60,
      range100Km: 300,
      reserveArrival: 20,
      factor: 1.15,
    }

    expect(() => calculateChargingStops(route, safeRange, evParams)).toThrow(StopPlacementError)
  })

  it('should set distanceToNext correctly for consecutive stops', () => {
    const route = createRoute(500)
    const safeRange: SafeRange = {
      safeRangeKm: 120,
      effectiveRangeKm: 250,
      bufferKm: 10,
      thresholdKm: 110,
    }
    const evParams: EVParameters = {
      socNow: 75,
      range100Km: 350,
      reserveArrival: 20,
      factor: 1.15,
    }

    const stops = calculateChargingStops(route, safeRange, evParams)
    if (stops.length >= 2) {
      const firstStop = stops[0]
      const secondStop = stops[1]
      const expectedDistance = secondStop.distanceFromStartKm - firstStop.distanceFromStartKm
      expect(firstStop.distanceToNextKm).toBeCloseTo(expectedDistance, 0)
    }
  })
})
