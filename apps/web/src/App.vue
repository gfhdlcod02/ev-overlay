<template>
  <div class="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
    <!-- Left Panel: Inputs and Summary -->
    <div class="w-full lg:w-96 p-4 space-y-4 overflow-y-auto">
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
    </div>

    <!-- Right Panel: Map -->
    <div class="flex-1 p-4 min-h-[400px]">
      <RouteMap :result="result" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTripInput } from './composables/useTripInput'
import TripInputForm from './components/TripInputForm.vue'
import RouteMap from './components/RouteMap.vue'
import TripSummary from './components/TripSummary.vue'
import ChargingStopList from './components/ChargingStopList.vue'
import ErrorDisplay from './components/ErrorDisplay.vue'
import LoadingState from './components/LoadingState.vue'

const { result, status, error } = useTripInput()
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