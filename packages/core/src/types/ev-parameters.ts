/**
 * Validated EV parameters for trip planning
 */
export interface EVParameters {
  /** Current state of charge (0-100) */
  socNow: number
  /** Vehicle range at 100% charge (km) */
  range100Km: number
  /** Minimum charge on arrival (0-50, default 20) */
  reserveArrival: number
  /** Consumption factor multiplier (≥ 1.0) */
  factor: number
}

/**
 * Validation bounds for EV parameters
 */
export const EVParameterBounds = {
  socNow: { min: 0, max: 100 },
  range100Km: { min: 0.1, max: 2000 },
  reserveArrival: { min: 0, max: 50 },
  factor: { min: 1.0, max: 3.0 },
} as const

/**
 * Default values for EV parameters
 */
export const EVParameterDefaults = {
  reserveArrival: 20,
  factor: 1.15,
  chargeToPercent: 80,
  bufferKm: 10,
  maxStops: 5,
} as const
