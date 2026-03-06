import { describe, it, expect } from 'vitest'
import { haversineDistance, distanceBetween, pathDistance } from './haversine'

describe('haversineDistance', () => {
  it('should calculate distance between San Francisco and Los Angeles', () => {
    // San Francisco: 37.7749, -122.4194
    // Los Angeles: 34.0522, -118.2437
    const distance = haversineDistance(37.7749, -122.4194, 34.0522, -118.2437)
    // Expected: ~559 km
    expect(distance).toBeGreaterThan(550)
    expect(distance).toBeLessThan(570)
  })

  it('should calculate distance between New York and London', () => {
    // New York: 40.7128, -74.0060
    // London: 51.5074, -0.1278
    const distance = haversineDistance(40.7128, -74.006, 51.5074, -0.1278)
    // Expected: ~5570 km
    expect(distance).toBeGreaterThan(5500)
    expect(distance).toBeLessThan(5600)
  })

  it('should return 0 for same point', () => {
    const distance = haversineDistance(37.7749, -122.4194, 37.7749, -122.4194)
    expect(distance).toBe(0)
  })

  it('should calculate small distances accurately', () => {
    // Two points 1 km apart roughly
    const distance = haversineDistance(37.7749, -122.4194, 37.7839, -122.4194)
    expect(distance).toBeGreaterThan(0.9)
    expect(distance).toBeLessThan(1.1)
  })

  it('should handle negative coordinates (Southern Hemisphere)', () => {
    // Sydney, Australia: -33.8688, 151.2093
    // Melbourne, Australia: -37.8136, 144.9631
    const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631)
    // Expected: ~713 km
    expect(distance).toBeGreaterThan(700)
    expect(distance).toBeLessThan(730)
  })
})

describe('distanceBetween', () => {
  it('should calculate distance between two coordinate pairs', () => {
    const coord1: [number, number] = [37.7749, -122.4194]
    const coord2: [number, number] = [34.0522, -118.2437]
    const distance = distanceBetween(coord1, coord2)
    expect(distance).toBeGreaterThan(550)
    expect(distance).toBeLessThan(570)
  })

  it('should be symmetric', () => {
    const coord1: [number, number] = [37.7749, -122.4194]
    const coord2: [number, number] = [34.0522, -118.2437]
    const distance1 = distanceBetween(coord1, coord2)
    const distance2 = distanceBetween(coord2, coord1)
    expect(distance1).toBeCloseTo(distance2, 6)
  })
})

describe('pathDistance', () => {
  it('should return 0 for single coordinate', () => {
    const coords: [number, number][] = [[37.7749, -122.4194]]
    expect(pathDistance(coords)).toBe(0)
  })

  it('should return 0 for empty array', () => {
    expect(pathDistance([])).toBe(0)
  })

  it('should calculate total distance for multiple points', () => {
    // SF -> LA -> San Diego
    const coords: [number, number][] = [
      [37.7749, -122.4194], // San Francisco
      [34.0522, -118.2437], // Los Angeles (~559 km from SF)
      [32.7157, -117.1611], // San Diego (~180 km from LA)
    ]
    const distance = pathDistance(coords)
    // Expected: ~739 km total
    expect(distance).toBeGreaterThan(730)
    expect(distance).toBeLessThan(750)
  })

  it('should handle two points correctly', () => {
    const coords: [number, number][] = [
      [37.7749, -122.4194],
      [34.0522, -118.2437],
    ]
    const distance = pathDistance(coords)
    expect(distance).toBeGreaterThan(550)
    expect(distance).toBeLessThan(570)
  })
})
