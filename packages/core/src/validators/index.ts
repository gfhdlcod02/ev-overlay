import type { Location } from '../types'

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate coordinate bounds
 */
export function validateCoordinate(lat: number, lng: number): ValidationResult {
  const errors: string[] = []

  if (typeof lat !== 'number' || !Number.isFinite(lat)) {
    errors.push('Latitude must be a valid number')
  } else if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90')
  }

  if (typeof lng !== 'number' || !Number.isFinite(lng)) {
    errors.push('Longitude must be a valid number')
  } else if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate a Location object
 */
export function validateLocation(location: Location): ValidationResult {
  return validateCoordinate(location.lat, location.lng)
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = []

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${fieldName} must be a valid number`)
    return { valid: false, errors }
  }

  if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`)
  }

  if (value > max) {
    errors.push(`${fieldName} must be at most ${max}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors)
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  }
}
