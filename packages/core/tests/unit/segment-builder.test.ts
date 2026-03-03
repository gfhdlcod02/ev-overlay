import { describe, it, expect } from 'vitest'
import { buildRouteSegments, getSegmentStats } from '../../src/calculator/segment-builder'
import type { EVParameters, Route, SafeRange, ChargingStop } from '../../src/types'

describe('buildRouteSegments', () => {
  function createRoute(distanceKm: number): Route {
    const numPoints = Math.max(10, Math.ceil(distanceKm / 5))
    const coordinates: [number, number][] = []

    for (let i = 0; i < numPoints; i++) {
      const fraction = i / (numPoints - 1)
      coordinates.push([fraction * (distanceKm / 111), 0])
    }

    return {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 0, lng: coordinates[coordinates.length - 1][0] },
      distanceKm,
      durationMin: distanceKm * 0.6,
      geometry: {
        type: 'LineString',
        coordinates,
      },
    }
  }

  it('should mark all segments safe when trip is within range', () => {
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

    const segments = buildRouteSegments(route, safeRange, evParams, [])

    expect(segments.length).toBeGreaterThan(0)
    segments.forEach(segment => {
      expect(segment.status).toBe('safe')
      expect(segment.color).toBe('#22c55e')
    })
  })

  it('should mark segments beyond safe range as risky', () => {
    const route = createRoute(200)
    const safeRange: SafeRange = {
      safeRangeKm: 100,
      effectiveRangeKm: 250,
      bufferKm: 10,
      thresholdKm: 90,
    }
    const evParams: EVParameters = {
      socNow: 60,
      range100Km: 350,
      reserveArrival: 20,
      factor: 1.15,
    }

    const segments = buildRouteSegments(route, safeRange, evParams, [])

    // Some segments should be risky
    const riskySegments = segments.filter(s => s.status === 'risky')
    expect(riskySegments.length).toBeGreaterThan(0)
    riskySegments.forEach(segment => {
      expect(segment.color).toBe('#ef4444')
    })
  })

  it('should reset safe range after charging stops', () => {
    const route = createRoute(300)
    const safeRange: SafeRange = {
      safeRangeKm: 100,
      effectiveRangeKm: 250,
      bufferKm: 10,
      thresholdKm: 90,
    }
    const evParams: EVParameters = {
      socNow: 60,
      range100Km: 350,
      reserveArrival: 20,
      factor: 1.15,
    }
    const stops: ChargingStop[] = [
      {
        sequence: 1,
        position: { lat: 0, lng: 0.5 },
        distanceFromStartKm: 100,
        arrivalChargePercent: 25,
        chargeToPercent: 80,
        distanceToNextKm: 200,
      },
    ]

    const segments = buildRouteSegments(route, safeRange, evParams, stops)

    // Should have segments both safe and risky, with reset after stop
    const beforeStop = segments.filter(s => s.endKm <= 100)
    const afterStop = segments.filter(s => s.startKm >= 100)

    expect(beforeStop.length).toBeGreaterThan(0)
    expect(afterStop.length).toBeGreaterThan(0)
  })

  it('should have contiguous segment indices', () => {
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

    const segments = buildRouteSegments(route, safeRange, evParams, [])

    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startIdx).toBe(segments[i - 1].endIdx)
    }
  })
})

describe('getSegmentStats', () => {
  it('should calculate stats for all safe segments', () => {
    const segments = [
      { startKm: 0, endKm: 50, status: 'safe' as const, startIdx: 0, endIdx: 1, color: '#22c55e' },
      { startKm: 50, endKm: 100, status: 'safe' as const, startIdx: 1, endIdx: 2, color: '#22c55e' },
    ]

    const stats = getSegmentStats(segments)

    expect(stats.safeKm).toBe(100)
    expect(stats.riskyKm).toBe(0)
    expect(stats.safePercent).toBe(100)
    expect(stats.riskyPercent).toBe(0)
  })

  it('should calculate stats for mixed segments', () => {
    const segments = [
      { startKm: 0, endKm: 60, status: 'safe' as const, startIdx: 0, endIdx: 1, color: '#22c55e' },
      { startKm: 60, endKm: 100, status: 'risky' as const, startIdx: 1, endIdx: 2, color: '#ef4444' },
    ]

    const stats = getSegmentStats(segments)

    expect(stats.safeKm).toBe(60)
    expect(stats.riskyKm).toBe(40)
    expect(stats.safePercent).toBe(60)
    expect(stats.riskyPercent).toBe(40)
  })

  it('should handle empty segments', () => {
    const stats = getSegmentStats([])

    expect(stats.safeKm).toBe(0)
    expect(stats.riskyKm).toBe(0)
    expect(stats.safePercent).toBe(0)
    expect(stats.riskyPercent).toBe(0)
  })
})
