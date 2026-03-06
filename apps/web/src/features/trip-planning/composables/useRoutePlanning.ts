import { computed } from 'vue'
import type { Location } from '@core'
import {
  calculateSafeRange,
  calculateChargingStops,
  buildRouteSegments,
  buildGoogleMapsUrl,
  StopPlacementError,
} from '@core'
import { useTripInput } from '@/features/trip-planning/composables/useTripInput'
import { fetchRoute, geocodeAddress } from '@/services/api-client'

/**
 * Check if string is coordinates format "lat,lng"
 */
function isCoordinates(str: string): boolean {
  const parts = str.split(',').map(s => s.trim())
  if (parts.length !== 2) return false
  const [lat, lng] = parts.map(Number)
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

/**
 * Parse coordinates string to Location
 */
function parseCoordinates(str: string): Location | null {
  const parts = str.split(',').map(s => s.trim())
  if (parts.length !== 2) return null
  const [lat, lng] = parts.map(Number)
  if (isNaN(lat) || isNaN(lng)) return null
  return { lat, lng, address: str }
}

export function useRoutePlanning() {
  const { input, evParams, canSubmit, setResult, setError, resetInput } = useTripInput()

  const canPlan = computed(() => canSubmit.value)

  async function planTrip(): Promise<void> {
    // Note: canSubmit check is done in handleSubmit before calling this
    // Don't check again here as setLoading() would have already been called

    try {
      // Get coordinates - skip geocoding if already coordinates
      const [originLocation, destinationLocation] = await Promise.all([
        isCoordinates(input.value.origin)
          ? parseCoordinates(input.value.origin)
          : geocodeAddress(input.value.origin),
        isCoordinates(input.value.destination)
          ? parseCoordinates(input.value.destination)
          : geocodeAddress(input.value.destination),
      ])

      if (!originLocation) {
        setError({
          code: 'GEOCODE_FAILED',
          message: `Could not find location: ${input.value.origin}`,
        })
        return
      }

      if (!destinationLocation) {
        setError({
          code: 'GEOCODE_FAILED',
          message: `Could not find location: ${input.value.destination}`,
        })
        return
      }

      // Fetch route from API using coordinates
      const route = await fetchRoute({
        origin: `${originLocation.lat},${originLocation.lng}`,
        destination: `${destinationLocation.lat},${destinationLocation.lng}`,
      })

      // Calculate safe range
      const safeRange = calculateSafeRange(evParams.value)

      // Calculate charging stops
      let stops
      try {
        stops = calculateChargingStops(route, safeRange, evParams.value)
      } catch (e) {
        if (e instanceof StopPlacementError) {
          setError({ code: 'TOO_MANY_STOPS', message: e.message })
          return
        }
        throw e
      }

      // Build route segments
      const segments = buildRouteSegments(route, safeRange, evParams.value, stops)

      // Build Google Maps URL
      const googleMapsUrl = buildGoogleMapsUrl(route.origin, route.destination, stops)

      // Calculate total stats
      const totalDistanceKm = route.distanceKm
      const totalDurationMin = route.durationMin
      const reachable = stops.length > 0 || safeRange.safeRangeKm >= totalDistanceKm

      setResult({
        input: evParams.value,
        route,
        safeRange,
        stops,
        segments,
        googleMapsUrl,
        totalDistanceKm,
        totalDurationMin,
        reachable,
      })
    } catch (e) {
      // Don't show error for user-initiated cancellations (e.g., new search started)
      if (e instanceof Error && e.name === 'AbortError') {
        return
      }
      const message = e instanceof Error ? e.message : 'Failed to plan trip'
      setError({ code: 'PLAN_FAILED', message })
    }
  }

  return {
    canPlan,
    planTrip,
    resetInput,
  }
}
