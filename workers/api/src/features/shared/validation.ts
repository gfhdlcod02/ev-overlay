/**
 * Input validation utilities for API endpoints
 * Implements security requirements from specification
 */

// Coordinate bounds
const LAT_MIN = -90
const LAT_MAX = 90
const LNG_MIN = -180
const LNG_MAX = 180

// EV parameter bounds
const SOC_MIN = 0
const SOC_MAX = 100
const POWER_MIN = 0
const POWER_MAX = 1000 // kW, reasonable upper bound

/**
 * Validate latitude is within valid range
 */
export function validateLatitude(lat: unknown): { valid: boolean; error?: string } {
  if (typeof lat !== 'number' || isNaN(lat)) {
    return { valid: false, error: 'Latitude must be a number' }
  }
  if (lat < LAT_MIN || lat > LAT_MAX) {
    return { valid: false, error: `Latitude must be between ${LAT_MIN} and ${LAT_MAX}` }
  }
  return { valid: true }
}

/**
 * Validate longitude is within valid range
 */
export function validateLongitude(lng: unknown): { valid: boolean; error?: string } {
  if (typeof lng !== 'number' || isNaN(lng)) {
    return { valid: false, error: 'Longitude must be a number' }
  }
  if (lng < LNG_MIN || lng > LNG_MAX) {
    return { valid: false, error: `Longitude must be between ${LNG_MIN} and ${LNG_MAX}` }
  }
  return { valid: true }
}

/**
 * Validate SoC (State of Charge) percentage
 */
export function validateSoC(soc: unknown): { valid: boolean; error?: string } {
  if (typeof soc !== 'number' || isNaN(soc)) {
    return { valid: false, error: 'SoC must be a number' }
  }
  if (soc < SOC_MIN || soc > SOC_MAX) {
    return { valid: false, error: `SoC must be between ${SOC_MIN} and ${SOC_MAX}` }
  }
  return { valid: true }
}

/**
 * Validate power value is positive
 */
export function validatePower(power: unknown): { valid: boolean; error?: string } {
  if (typeof power !== 'number' || isNaN(power)) {
    return { valid: false, error: 'Power must be a number' }
  }
  if (power <= POWER_MIN) {
    return { valid: false, error: 'Power must be greater than 0' }
  }
  if (power > POWER_MAX) {
    return { valid: false, error: `Power must not exceed ${POWER_MAX} kW` }
  }
  return { valid: true }
}

/**
 * Validate route request body
 */
export function validateRouteRequest(body: unknown): { valid: boolean; errors?: string[] } {
  const errors: string[] = []

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] }
  }

  const req = body as Record<string, unknown>

  // Validate origin
  if (!req.origin || typeof req.origin !== 'object') {
    errors.push('Origin is required')
  } else {
    const origin = req.origin as Record<string, unknown>
    const latCheck = validateLatitude(origin.lat)
    if (!latCheck.valid) errors.push(`Origin: ${latCheck.error}`)
    const lngCheck = validateLongitude(origin.lng)
    if (!lngCheck.valid) errors.push(`Origin: ${lngCheck.error}`)
  }

  // Validate destination
  if (!req.destination || typeof req.destination !== 'object') {
    errors.push('Destination is required')
  } else {
    const dest = req.destination as Record<string, unknown>
    const latCheck = validateLatitude(dest.lat)
    if (!latCheck.valid) errors.push(`Destination: ${latCheck.error}`)
    const lngCheck = validateLongitude(dest.lng)
    if (!lngCheck.valid) errors.push(`Destination: ${lngCheck.error}`)
  }

  // Validate vehicle params
  if (!req.vehicle || typeof req.vehicle !== 'object') {
    errors.push('Vehicle parameters are required')
  } else {
    const vehicle = req.vehicle as Record<string, unknown>

    const socCheck = validateSoC(vehicle.currentSocPercent)
    if (!socCheck.valid) errors.push(`Vehicle: ${socCheck.error}`)

    if (vehicle.reserveSocPercent !== undefined) {
      const reserveCheck = validateSoC(vehicle.reserveSocPercent)
      if (!reserveCheck.valid) errors.push(`Vehicle reserve: ${reserveCheck.error}`)
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}

/**
 * Validate stations query parameters
 */
export function validateStationsQuery(params: Record<string, string>): { valid: boolean; errors?: string[] } {
  const errors: string[] = []

  // Validate bounding box coordinates
  const lat1 = parseFloat(params.lat1)
  const lat2 = parseFloat(params.lat2)
  const lng1 = parseFloat(params.lng1)
  const lng2 = parseFloat(params.lng2)

  if (isNaN(lat1)) errors.push('lat1 must be a valid number')
  else {
    const check = validateLatitude(lat1)
    if (!check.valid) errors.push(`lat1: ${check.error}`)
  }

  if (isNaN(lat2)) errors.push('lat2 must be a valid number')
  else {
    const check = validateLatitude(lat2)
    if (!check.valid) errors.push(`lat2: ${check.error}`)
  }

  if (isNaN(lng1)) errors.push('lng1 must be a valid number')
  else {
    const check = validateLongitude(lng1)
    if (!check.valid) errors.push(`lng1: ${check.error}`)
  }

  if (isNaN(lng2)) errors.push('lng2 must be a valid number')
  else {
    const check = validateLongitude(lng2)
    if (!check.valid) errors.push(`lng2: ${check.error}`)
  }

  // Validate limit if provided
  if (params.limit) {
    const limit = parseInt(params.limit, 10)
    if (isNaN(limit) || limit < 1 || limit > 500) {
      errors.push('limit must be between 1 and 500')
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // Remove control characters
    .trim()
    .slice(0, 1000) // Reasonable max length
}

/**
 * Build safe URL with encoded parameters
 */
export function buildSafeUrl(baseUrl: string, params: Record<string, string | number>): string {
  const url = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value))
  })
  return url.toString()
}
