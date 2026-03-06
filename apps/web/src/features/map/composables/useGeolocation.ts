import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useLocationStore } from '@/features/map/stores/location'
import type { UserLocation, GeolocationError } from '@/types/location'
import { GeolocationStatus, PermissionState } from '@/types/location'
import { GEOLOCATION_TIMEOUT, isAccuracyAcceptable } from '@/utils/coordinates'

/**
 * Options for useGeolocation composable
 */
export interface UseGeolocationOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number
  /** Accuracy threshold in meters (default: 1000) */
  accuracyThreshold?: number
}

/**
 * Return type for useGeolocation composable
 */
export interface UseGeolocationReturn {
  /** Current position or null */
  readonly position: ComputedRef<UserLocation | null>
  /** Current status */
  readonly status: ComputedRef<GeolocationStatus>
  /** Error details or null */
  readonly error: ComputedRef<GeolocationError | null>
  /** True if loading */
  readonly isLoading: ComputedRef<boolean>
  /** True if permission granted */
  readonly isGranted: ComputedRef<boolean>
  /** True if permission denied */
  readonly isDenied: ComputedRef<boolean>
  /** Request user location */
  requestLocation: () => Promise<void>
  /** Clear location state */
  clearLocation: () => void
}

/**
 * Composable for accessing browser geolocation API
 *
 * @example
 * ```ts
 * const { position, isLoading, requestLocation } = useGeolocation({
 *   timeout: 5000,
 *   accuracyThreshold: 1000
 * })
 * ```
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const { timeout = GEOLOCATION_TIMEOUT, accuracyThreshold = 1000 } = options

  const store = useLocationStore()

  // ============ Computed State ============
  const position = computed(() => store.position)
  const status = computed(() => store.status)
  const error = computed(() => store.error)
  const isLoading = computed(() => store.status === GeolocationStatus.LOADING)
  const isGranted = computed(() => store.permission === PermissionState.GRANTED)
  const isDenied = computed(() => store.permission === PermissionState.DENIED)

  // ============ Actions ============
  /**
   * Request user location from browser
   * Handles permission, timeout, and accuracy validation
   */
  async function requestLocation(): Promise<void> {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      store.setError({
        code: 2, // POSITION_UNAVAILABLE
        message: 'Geolocation is not supported by this browser',
      })
      return
    }

    // Set loading state
    store.setStatus(GeolocationStatus.LOADING)

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        geoPosition => {
          // Check accuracy threshold
          if (!isAccuracyAcceptable(geoPosition.coords.accuracy, accuracyThreshold)) {
            store.setError({
              code: 2,
              message: `Insufficient accuracy: ${geoPosition.coords.accuracy}m (threshold: ${accuracyThreshold}m)`,
            })
            resolve()
            return
          }

          store.setPosition(geoPosition)
          resolve()
        },
        // Error callback
        positionError => {
          const err: GeolocationError = {
            code: positionError.code,
            message: getErrorMessage(positionError),
          }
          store.setError(err)
          resolve()
        },
        // Options
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: 0, // Don't use cached position
        }
      )
    })
  }

  /**
   * Clear location state and reset to defaults
   */
  function clearLocation(): void {
    store.reset()
  }

  /**
   * Get human-readable error message from GeolocationPositionError
   */
  function getErrorMessage(err: GeolocationPositionError): string {
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        return 'Location permission denied. Please enable location access in your browser settings.'
      case 2: // POSITION_UNAVAILABLE
        return 'Unable to retrieve your location. Please try again or enter manually.'
      case 3: // TIMEOUT
        return 'Location request timed out. Please try again or enter manually.'
      default:
        return 'An unknown error occurred while retrieving your location.'
    }
  }

  return {
    position,
    status,
    error,
    isLoading,
    isGranted,
    isDenied,
    requestLocation,
    clearLocation,
  }
}
