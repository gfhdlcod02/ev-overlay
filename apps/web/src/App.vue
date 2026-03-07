<template>
  <div class="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
    <!-- Left Panel: Inputs and Summary -->
    <div class="w-full lg:w-96 p-4 space-y-4 lg:h-screen lg:overflow-y-auto flex flex-col">
      <h1 class="text-2xl font-bold text-gray-900">EV Trip Planner</h1>

      <TripInputForm />

      <ErrorDisplay :error="error" />

      <LoadingState v-if="status === 'loading'" :loading="true" message="Planning your route..." />

      <template v-if="result && status === 'success'">
        <TripSummary :result="result" />
        <ChargingStopList :stops="result.stops" />
      </template>

      <div class="mt-auto pt-4 text-xs text-gray-400 text-center">
        {{ appVersion }}
      </div>
    </div>

    <!-- Right Panel: Map -->
    <div class="flex-1 p-4 min-h-[400px] lg:sticky lg:top-0 lg:h-screen">
      <RouteMap :result="result" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTripInput } from '@/features/trip-planning/composables/useTripInput'
import { useGeolocation } from '@/features/map/composables/useGeolocation'
import { useWebVitals } from '@/composables/useWebVitals'
import TripInputForm from '@/features/trip-planning/components/TripInputForm.vue'
import RouteMap from '@/features/map/components/RouteMap.vue'
import TripSummary from '@/features/trip-planning/components/TripSummary.vue'
import ChargingStopList from '@/features/trip-planning/components/ChargingStopList.vue'
import ErrorDisplay from '@/features/ui/components/ErrorDisplay.vue'
import LoadingState from '@/features/ev-params/components/LoadingState.vue'

const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'

const { result, status, error } = useTripInput()
const { requestLocation } = useGeolocation({
  timeout: 5000,
  accuracyThreshold: 1000,
})

// Initialize Web Vitals tracking for performance monitoring
useWebVitals()

// Request geolocation on mount
onMounted(() => {
  requestLocation()
})
</script>

<style>
/* Global styles */
html {
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

body {
  margin: 0;
  padding: 0;
}
</style>
