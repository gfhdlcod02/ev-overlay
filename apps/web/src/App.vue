<template>
  <div class="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
    <!-- Left Panel: Inputs and Summary -->
    <div class="w-full lg:w-96 p-4 space-y-4 lg:h-screen lg:overflow-y-auto flex flex-col">
      <h1 class="text-2xl font-bold text-gray-900">EV Trip Planner</h1>

      <TripInputForm />

      <ErrorDisplay :error="error" />

      <LoadingState
        v-if="status === 'loading'"
        :loading="true"
        message="Planning your route..."
      />

      <template v-if="result && status === 'success'">
        <TripSummary :result="result" />
        <ChargingStopList :stops="result.stops" />
      </template>

      <div class="mt-auto pt-4 text-xs text-gray-400 text-center">
        v{{ appVersion }}
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
import { useTripInput } from './composables/useTripInput'
import { useGeolocation } from './composables/useGeolocation'
import TripInputForm from './components/TripInputForm.vue'
import RouteMap from './components/RouteMap.vue'
import TripSummary from './components/TripSummary.vue'
import ChargingStopList from './components/ChargingStopList.vue'
import ErrorDisplay from './components/ErrorDisplay.vue'
import LoadingState from './components/LoadingState.vue'

const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'

const { result, status, error } = useTripInput()
const { requestLocation } = useGeolocation({
  timeout: 5000,
  accuracyThreshold: 1000,
})

// Request geolocation on mount
onMounted(() => {
  requestLocation()
})
</script>

<style>
/* Global styles */
html {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
}

body {
  margin: 0;
  padding: 0;
}
</style>
