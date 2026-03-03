import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocationStore } from './location'
import { GeolocationStatus, PermissionState } from '@/types/location'
import { STORAGE_KEY } from '@/utils/coordinates'

// Mock sessionStorage
const mockSessionStorage = {
  storage: {} as Record<string, string>,
  getItem(key: string) {
    return this.storage[key] || null
  },
  setItem(key: string, value: string) {
    this.storage[key] = value
  },
  removeItem(key: string) {
    delete this.storage[key]
  },
  clear() {
    this.storage = {}
  },
}

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

describe('location store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear sessionStorage
    sessionStorage.clear()
  })

  describe('initial state', () => {
    it('should have correct default state', () => {
      const store = useLocationStore()

      expect(store.position).toBeNull()
      expect(store.status).toBe(GeolocationStatus.IDLE)
      expect(store.error).toBeNull()
      expect(store.hasUserInteracted).toBe(false)
      expect(store.permission).toBe(PermissionState.PROMPT)
    })
  })

  describe('getters', () => {
    it('should compute isLocationAvailable correctly', () => {
      const store = useLocationStore()

      expect(store.isLocationAvailable).toBe(false)

      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)

      expect(store.isLocationAvailable).toBe(true)
    })

    it('should compute isAccurate correctly', () => {
      const store = useLocationStore()

      expect(store.isAccurate).toBe(false)

      // Accurate position (< 1000m)
      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 500,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)

      expect(store.isAccurate).toBe(true)
    })

    it('should return false for isAccurate when accuracy > 1000m', () => {
      const store = useLocationStore()

      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 1500,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)

      expect(store.isAccurate).toBe(false)
    })

    it('should compute locationLabel correctly', () => {
      const store = useLocationStore()

      expect(store.locationLabel).toBeNull()

      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)

      expect(store.locationLabel).toContain('Current Location')
    })

    it('should compute canAutoCenter correctly', () => {
      const store = useLocationStore()

      // Initially false (no position)
      expect(store.canAutoCenter).toBe(false)

      // Set position - should be true
      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)

      expect(store.canAutoCenter).toBe(true)

      // Mark user interaction - should be false
      store.markUserInteracted()

      expect(store.canAutoCenter).toBe(false)
    })
  })

  describe('setPosition', () => {
    it('should set position and update status', () => {
      const store = useLocationStore()
      const mockPosition = {
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: 1234567890,
      } as GeolocationPosition

      store.setPosition(mockPosition)

      expect(store.position).toEqual({
        lat: 13.7563,
        lng: 100.5018,
        accuracy: 100,
        timestamp: 1234567890,
      })
      expect(store.status).toBe(GeolocationStatus.SUCCESS)
      expect(store.permission).toBe(PermissionState.GRANTED)
      expect(store.error).toBeNull()
    })

    it('should handle invalid coordinates', () => {
      const store = useLocationStore()
      const mockPosition = {
        coords: {
          latitude: 91, // Invalid
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: Date.now(),
      } as GeolocationPosition

      store.setPosition(mockPosition)

      expect(store.position).toBeNull()
      expect(store.status).toBe(GeolocationStatus.ERROR)
    })
  })

  describe('setError', () => {
    it('should handle permission denied', () => {
      const store = useLocationStore()

      store.setError({
        code: 1, // PERMISSION_DENIED
        message: 'Permission denied',
      })

      expect(store.status).toBe(GeolocationStatus.DENIED)
      expect(store.permission).toBe(PermissionState.DENIED)
    })

    it('should handle position unavailable', () => {
      const store = useLocationStore()

      store.setError({
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
      })

      expect(store.status).toBe(GeolocationStatus.ERROR)
    })

    it('should handle timeout', () => {
      const store = useLocationStore()

      store.setError({
        code: 3, // TIMEOUT
        message: 'Timeout',
      })

      expect(store.status).toBe(GeolocationStatus.TIMEOUT)
    })
  })

  describe('markUserInteracted', () => {
    it('should set hasUserInteracted to true', () => {
      const store = useLocationStore()

      expect(store.hasUserInteracted).toBe(false)

      store.markUserInteracted()

      expect(store.hasUserInteracted).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      const store = useLocationStore()

      // Set some state
      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)
      store.markUserInteracted()

      // Reset
      store.reset()

      expect(store.position).toBeNull()
      expect(store.status).toBe(GeolocationStatus.IDLE)
      expect(store.error).toBeNull()
      expect(store.hasUserInteracted).toBe(false)
      expect(store.permission).toBe(PermissionState.PROMPT)
    })

    it('should clear sessionStorage', () => {
      const store = useLocationStore()

      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)

      expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull()

      store.reset()

      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('sessionStorage persistence', () => {
    it('should save position to sessionStorage on success', () => {
      const store = useLocationStore()

      store.setPosition({
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 100,
        },
        timestamp: 1234567890,
      } as GeolocationPosition)

      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)
      expect(stored.v).toBe(1)
      expect(stored.lat).toBe(13.7563)
      expect(stored.lng).toBe(100.5018)
      expect(stored.accuracy).toBe(100)
      expect(stored.status).toBe('granted')
    })

    it('should hydrate from sessionStorage on init', () => {
      // Pre-populate sessionStorage
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          lat: 13.7563,
          lng: 100.5018,
          accuracy: 100,
          status: 'granted',
          savedAt: 1234567890,
        })
      )

      const store = useLocationStore()

      expect(store.position).toEqual({
        lat: 13.7563,
        lng: 100.5018,
        accuracy: 100,
        timestamp: 1234567890,
      })
      expect(store.status).toBe(GeolocationStatus.SUCCESS)
      expect(store.permission).toBe(PermissionState.GRANTED)
    })
  })
})
