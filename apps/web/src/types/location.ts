/**
 * Type definitions for geolocation functionality
 */

/**
 * Status of a geolocation request
 */
export enum GeolocationStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  DENIED = 'denied',
  TIMEOUT = 'timeout',
}

/**
 * Browser permission state for geolocation
 */
export enum PermissionState {
  PROMPT = 'prompt',
  GRANTED = 'granted',
  DENIED = 'denied',
}

/**
 * User's geographic position with metadata
 */
export interface UserLocation {
  /** Latitude in decimal degrees (-90 to 90) */
  lat: number
  /** Longitude in decimal degrees (-180 to 180) */
  lng: number
  /** Accuracy radius in meters */
  accuracy: number
  /** Unix timestamp of reading */
  timestamp: number
}

/**
 * Geolocation error details
 */
export interface GeolocationError {
  /** Error code from Geolocation API */
  code: number
  /** Human-readable error message */
  message: string
}

/**
 * Complete state managed by the geolocation store
 */
export interface LocationState {
  /** Current status of geolocation request */
  status: GeolocationStatus
  /** Last known position */
  position: UserLocation | null
  /** Error details if failed */
  error: GeolocationError | null
  /** Browser permission state */
  permission: PermissionState
  /** Whether user has manually interacted with map */
  hasUserInteracted: boolean
}

/**
 * Stored location data in sessionStorage
 */
export interface SessionStoredLocation {
  /** Schema version */
  v: 1
  lat: number
  lng: number
  accuracy: number
  status: 'granted' | 'denied'
  savedAt: number
}

/**
 * Map view configuration
 */
export interface MapViewState {
  /** [lat, lng] center point */
  center: [number, number]
  /** Zoom level (1-20 typical for Leaflet) */
  zoom: number
  /** Whether showing default (Thailand) view */
  isDefault: boolean
  /** Whether user manually panned/zoomed */
  hasUserInteracted: boolean
}

/**
 * Origin input state
 */
export interface OriginInput {
  /** Selected location or null */
  value: UserLocation | null
  /** Display label ("Current Location" or address) */
  label: string
  /** How the value was set */
  source: 'geolocation' | 'manual' | null
}
