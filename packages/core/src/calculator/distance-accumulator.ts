import type { LineString } from '../types'
import { haversineDistance } from '../utils/haversine'

/**
 * Accumulate distance along a LineString geometry
 *
 * Returns an array where each element is the cumulative distance
 * from the start of the line to that coordinate.
 *
 * Uses Haversine formula for accurate Earth-surface distances.
 *
 * @param geometry - GeoJSON LineString
 * @returns Array of cumulative distances in kilometers (same length as coordinates)
 */
export function accumulateDistance(geometry: LineString): number[] {
  const coordinates = geometry.coordinates

  if (coordinates.length === 0) {
    return []
  }

  const distances: number[] = [0] // First point is at distance 0

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1]
    const curr = coordinates[i]

    // GeoJSON coordinates are [lng, lat]
    const segmentDistance = haversineDistance(prev[1], prev[0], curr[1], curr[0])
    const cumulativeDistance = distances[i - 1] + segmentDistance

    distances.push(Math.round(cumulativeDistance * 10000) / 10000) // Round to 4 decimals
  }

  return distances
}

/**
 * Find the index of the coordinate closest to a target distance
 *
 * @param distances - Array of cumulative distances
 * @param targetDistance - Target distance in km
 * @returns Index of closest coordinate
 */
export function findClosestIndex(distances: number[], targetDistance: number): number {
  if (distances.length === 0) return -1
  if (distances.length === 1) return 0

  let closestIdx = 0
  let closestDiff = Math.abs(distances[0] - targetDistance)

  for (let i = 1; i < distances.length; i++) {
    const diff = Math.abs(distances[i] - targetDistance)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIdx = i
    }
  }

  return closestIdx
}

/**
 * Get coordinate at a specific distance along the line
 *
 * @param geometry - GeoJSON LineString
 * @param targetDistance - Target distance in km
 * @returns Coordinate at that distance [lng, lat] or null if out of bounds
 */
export function getCoordinateAtDistance(
  geometry: LineString,
  targetDistance: number
): [number, number] | null {
  const distances = accumulateDistance(geometry)

  if (distances.length === 0 || targetDistance < 0 || targetDistance > distances[distances.length - 1]) {
    return null
  }

  const idx = findClosestIndex(distances, targetDistance)
  return geometry.coordinates[idx]
}
