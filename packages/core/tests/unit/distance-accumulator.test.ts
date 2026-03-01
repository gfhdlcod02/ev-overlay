import { describe, it, expect } from 'vitest'
import {
  accumulateDistance,
  findClosestIndex,
  getCoordinateAtDistance,
} from '../../src/calculator/distance-accumulator'
import type { LineString } from '../../src/types'

describe('accumulateDistance', () => {
  it('should return empty array for empty geometry', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [],
    }
    expect(accumulateDistance(geometry)).toEqual([])
  })

  it('should return [0] for single coordinate', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [[0, 0]],
    }
    expect(accumulateDistance(geometry)).toEqual([0])
  })

  it('should accumulate distances correctly for two points', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 1], // ~111 km north
      ],
    }
    const distances = accumulateDistance(geometry)
    expect(distances).toHaveLength(2)
    expect(distances[0]).toBe(0)
    expect(distances[1]).toBeGreaterThan(100)
    expect(distances[1]).toBeLessThan(120)
  })

  it('should accumulate distances for multiple points', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 1],  // ~111 km
        [0, 2],  // ~111 km more
        [0, 3],  // ~111 km more
      ],
    }
    const distances = accumulateDistance(geometry)
    expect(distances).toHaveLength(4)
    expect(distances[0]).toBe(0)
    expect(distances[1]).toBeGreaterThan(100)
    expect(distances[2]).toBeGreaterThan(200)
    expect(distances[3]).toBeGreaterThan(300)
    // Distances should be increasing
    expect(distances[1]).toBeLessThan(distances[2])
    expect(distances[2]).toBeLessThan(distances[3])
  })

  it('should handle east-west distances', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 0], // ~111 km east at equator
      ],
    }
    const distances = accumulateDistance(geometry)
    expect(distances[0]).toBe(0)
    expect(distances[1]).toBeGreaterThan(100)
    expect(distances[1]).toBeLessThan(120)
  })
})

describe('findClosestIndex', () => {
  it('should return 0 for single element', () => {
    expect(findClosestIndex([0], 100)).toBe(0)
  })

  it('should find exact match', () => {
    const distances = [0, 50, 100, 150, 200]
    expect(findClosestIndex(distances, 100)).toBe(2)
  })

  it('should find closest when no exact match', () => {
    const distances = [0, 50, 100, 150, 200]
    expect(findClosestIndex(distances, 75)).toBe(1) // 50 is closer to 75 than 100
    expect(findClosestIndex(distances, 130)).toBe(3) // 150 is closer to 130 than 100
  })

  it('should handle values below range', () => {
    const distances = [50, 100, 150]
    expect(findClosestIndex(distances, 0)).toBe(0)
  })

  it('should handle values above range', () => {
    const distances = [0, 50, 100]
    expect(findClosestIndex(distances, 200)).toBe(2)
  })
})

describe('getCoordinateAtDistance', () => {
  it('should return null for empty geometry', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [],
    }
    expect(getCoordinateAtDistance(geometry, 50)).toBeNull()
  })

  it('should return first coordinate for distance 0', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [10, 20],
        [11, 21],
      ],
    }
    expect(getCoordinateAtDistance(geometry, 0)).toEqual([10, 20])
  })

  it('should return coordinate at specified distance', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    }
    const coord = getCoordinateAtDistance(geometry, 150) // ~150km
    expect(coord).not.toBeNull()
    // Should return coordinate closest to 150km (~1.35 degrees)
  })

  it('should return null for distance beyond route', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 0.5], // ~55km
      ],
    }
    expect(getCoordinateAtDistance(geometry, 1000)).toBeNull()
  })

  it('should return null for negative distance', () => {
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 1],
      ],
    }
    expect(getCoordinateAtDistance(geometry, -10)).toBeNull()
  })
})
