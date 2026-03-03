import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  UserLocation,
  GeolocationError,
  SessionStoredLocation,
} from '@/types/location'
import {
  GeolocationStatus,
  PermissionState,
} from '@/types/location'
import {
  STORAGE_KEY,
  isValidLatitude,
  isValidLongitude,
  isValidAccuracy,
} from '@/utils/coordinates'

/**
 * Default state for the location store
 */
const defaultState = {
  position: null as UserLocation | null,
  status: GeolocationStatus.IDLE,
  error: null as GeolocationError | null,
  hasUserInteracted: false,
  permission: PermissionState.PROMPT,
}

/**
 * Pinia store for managing geolocation state
 */
export const useLocationStore = defineStore('location', () => {
  // ============ State ============
  const position = ref<UserLocation | null>(defaultState.position)
  const status = ref<GeolocationStatus>(defaultState.status)
  const error = ref<GeolocationError | null>(defaultState.error)
  const hasUserInteracted = ref<boolean>(defaultState.hasUserInteracted)
  const permission = ref<PermissionState>(defaultState.permission)

  // ============ Getters ============
  /**
   * True if a position is available
   */
  const isLocationAvailable = computed(() => position.value !== null)

  /**
   * True if position accuracy is within acceptable threshold (<= 1000m)
   */
  const isAccurate = computed(() => {
    if (!position.value) return false
    return position.value.accuracy <= 1000
  })

  /**
   * Label for the current location ("Current Location" with coordinates for debugging)
   */
  const locationLabel = computed(() => {
    if (!isLocationAvailable.value) return null
    if (!position.value) return null
    const { lat, lng } = position.value
    return `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  })

  /**
   * True if map can auto-center (position available and user hasn't interacted)
   */
  const canAutoCenter = computed(() => {
    return isLocationAvailable.value && !hasUserInteracted.value
  })

  // ============ Actions ============
  /**
   * Set position from GeolocationPosition API
   */
  function setPosition(geoPosition: GeolocationPosition): void {
    const { latitude, longitude, accuracy } = geoPosition.coords

    // Validate coordinates
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      setError({
        code: 2, // POSITION_UNAVAILABLE
        message: 'Invalid coordinates received from geolocation',
      })
      return
    }

    position.value = {
      lat: latitude,
      lng: longitude,
      accuracy: accuracy || 0,
      timestamp: geoPosition.timestamp,
    }
    status.value = GeolocationStatus.SUCCESS
    error.value = null
    permission.value = PermissionState.GRANTED

    // Persist to sessionStorage
    saveToStorage()
  }

  /**
   * Set error from GeolocationPositionError API
   */
  function setError(err: GeolocationError): void {
    error.value = err

    // Map error codes to status
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        status.value = GeolocationStatus.DENIED
        permission.value = PermissionState.DENIED
        break
      case 2: // POSITION_UNAVAILABLE
        status.value = GeolocationStatus.ERROR
        break
      case 3: // TIMEOUT
        status.value = GeolocationStatus.TIMEOUT
        break
      default:
        status.value = GeolocationStatus.ERROR
    }

    // Persist denied state to sessionStorage
    if (err.code === 1) {
      saveDeniedState()
    }
  }

  /**
   * Set status directly
   */
  function setStatus(newStatus: GeolocationStatus): void {
    status.value = newStatus
  }

  /**
   * Set permission state
   */
  function setPermission(newPermission: PermissionState): void {
    permission.value = newPermission
  }

  /**
   * Mark that user has manually interacted with the map
   * This prevents auto-recentering
   */
  function markUserInteracted(): void {
    hasUserInteracted.value = true
  }

  /**
   * Reset store to default state
   */
  function reset(): void {
    position.value = defaultState.position
    status.value = defaultState.status
    error.value = defaultState.error
    hasUserInteracted.value = defaultState.hasUserInteracted
    permission.value = defaultState.permission

    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Save successful location to sessionStorage
   */
  function saveToStorage(): void {
    if (!position.value || typeof sessionStorage === 'undefined') return

    try {
      const stored: SessionStoredLocation = {
        v: 1,
        lat: position.value.lat,
        lng: position.value.lng,
        accuracy: position.value.accuracy,
        status: 'granted',
        savedAt: Date.now(),
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // Ignore storage errors (e.g., private mode)
    }
  }

  /**
   * Save denied state to sessionStorage
   */
  function saveDeniedState(): void {
    if (typeof sessionStorage === 'undefined') return

    try {
      const stored: SessionStoredLocation = {
        v: 1,
        lat: 0,
        lng: 0,
        accuracy: 0,
        status: 'denied',
        savedAt: Date.now(),
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Hydrate store from sessionStorage on init
   */
  function hydrateFromStorage(): void {
    if (typeof sessionStorage === 'undefined') return

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const data: SessionStoredLocation = JSON.parse(stored)

      // Validate stored data
      if (data.v !== 1) return

      if (data.status === 'granted') {
        // Restore position
        if (
          isValidLatitude(data.lat) &&
          isValidLongitude(data.lng) &&
          isValidAccuracy(data.accuracy)
        ) {
          position.value = {
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy,
            timestamp: data.savedAt,
          }
          status.value = GeolocationStatus.SUCCESS
          permission.value = PermissionState.GRANTED
        }
      } else if (data.status === 'denied') {
        permission.value = PermissionState.DENIED
        status.value = GeolocationStatus.DENIED
      }
    } catch {
      // Ignore parse/storage errors
    }
  }

  // Hydrate on store creation
  hydrateFromStorage()

  return {
    // State
    position,
    status,
    error,
    hasUserInteracted,
    permission,
    // Getters
    isLocationAvailable,
    isAccurate,
    locationLabel,
    canAutoCenter,
    // Actions
    setPosition,
    setError,
    setStatus,
    setPermission,
    markUserInteracted,
    reset,
    hydrateFromStorage,
  }
})
