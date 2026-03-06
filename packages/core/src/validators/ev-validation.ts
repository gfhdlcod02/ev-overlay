import type { EVParameters } from '../types'
import { EVParameterBounds } from '../types'
import type { ValidationResult } from './index'
import { validateRange, combineValidations } from './index'

/**
 * Validate EV parameters for trip planning
 */
export function validateEVParameters(params: unknown): ValidationResult {
  const errors: string[] = []

  // Type guard: params must be an object
  if (typeof params !== 'object' || params === null) {
    errors.push('Parameters must be an object')
    return { valid: false, errors }
  }

  const p = params as Partial<EVParameters>

  // Validate each field
  const results: ValidationResult[] = []

  // socNow: 0-100
  if (p.socNow === undefined) {
    errors.push('State of charge (socNow) is required')
  } else {
    results.push(
      validateRange(
        p.socNow,
        EVParameterBounds.socNow.min,
        EVParameterBounds.socNow.max,
        'State of charge'
      )
    )
  }

  // range100Km: > 0
  if (p.range100Km === undefined) {
    errors.push('Vehicle range (range100Km) is required')
  } else {
    results.push(
      validateRange(
        p.range100Km,
        EVParameterBounds.range100Km.min,
        EVParameterBounds.range100Km.max,
        'Vehicle range'
      )
    )
  }

  // reserveArrival: 0-50 (defaults to 20)
  if (p.reserveArrival !== undefined) {
    results.push(
      validateRange(
        p.reserveArrival,
        EVParameterBounds.reserveArrival.min,
        EVParameterBounds.reserveArrival.max,
        'Reserve arrival charge'
      )
    )
  }

  // factor: ≥ 1.0
  if (p.factor !== undefined) {
    results.push(
      validateRange(
        p.factor,
        EVParameterBounds.factor.min,
        EVParameterBounds.factor.max,
        'Driving factor'
      )
    )
  }

  // Combine range validations
  const combined = combineValidations(...results)
  errors.push(...combined.errors)

  // Business rule: socNow must be > reserveArrival
  if (
    p.socNow !== undefined &&
    p.reserveArrival !== undefined &&
    typeof p.socNow === 'number' &&
    typeof p.reserveArrival === 'number'
  ) {
    if (p.socNow <= p.reserveArrival) {
      errors.push('Current charge must be greater than reserve arrival charge')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Normalize EV parameters with defaults
 */
export function normalizeEVParameters(input: {
  socNow: number
  range100Km: number
  reserveArrival?: number
  factor?: number
}): EVParameters {
  return {
    socNow: input.socNow,
    range100Km: input.range100Km,
    reserveArrival: input.reserveArrival ?? 20,
    factor: input.factor ?? 1.15,
  }
}
