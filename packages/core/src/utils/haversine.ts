/**
 * Calculate distance between two points on Earth using the Haversine formula
 *
 * @param lat1 - Latitude of first point in degrees
 * @param lng1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lng2 - Longitude of second point in degrees
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Calculate distance between two coordinate pairs
 * Coordinates are in [lat, lng] format
 */
export function distanceBetween(
  coord1: [number, number],
  coord2: [number, number]
): number {
  return haversineDistance(coord1[0], coord1[1], coord2[0], coord2[1])
}

/**
 * Calculate total distance along a path of coordinates
 * @param coordinates - Array of [lat, lng] coordinates
 * @returns Total distance in kilometers
 */
export function pathDistance(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0

  let total = 0
  for (let i = 1; i < coordinates.length; i++) {
    total += distanceBetween(coordinates[i - 1], coordinates[i])
  }

  return total
}
