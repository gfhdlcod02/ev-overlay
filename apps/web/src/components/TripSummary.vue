<template>
  <div v-if="result" class="bg-white rounded-lg shadow p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-3">Trip Summary</h3>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-50 rounded p-3">
        <p class="text-xs text-gray-500">Total Distance</p>
        <p class="text-lg font-semibold text-gray-900">
          {{ result.totalDistanceKm.toFixed(1) }} km
        </p>
      </div>

      <div class="bg-gray-50 rounded p-3">
        <p class="text-xs text-gray-500">Est. Duration</p>
        <p class="text-lg font-semibold text-gray-900">
          {{ formatDuration(result.totalDurationMin) }}
        </p>
      </div>

      <div class="bg-gray-50 rounded p-3">
        <p class="text-xs text-gray-500">Safe Range</p>
        <p class="text-lg font-semibold text-gray-900">
          {{ result.safeRange.safeRangeKm.toFixed(1) }} km
        </p>
      </div>

      <div class="bg-gray-50 rounded p-3">
        <p class="text-xs text-gray-500">Effective Range</p>
        <p class="text-lg font-semibold text-gray-900">
          {{ result.safeRange.effectiveRangeKm.toFixed(1) }} km
        </p>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Route Status:</span>
        <span :class="result.reachable ? 'text-green-600' : 'text-red-600'" class="font-medium">
          {{ result.reachable ? 'Reachable' : 'Needs Charging' }}
        </span>
      </div>
    </div>

    <!-- Google Maps Button -->
    <a
      v-if="result.googleMapsUrl"
      :href="result.googleMapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-4 flex items-center justify-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
    >
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path
          fill-rule="evenodd"
          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
          clip-rule="evenodd"
        />
      </svg>
      Open in Google Maps
    </a>
  </div>
</template>

<script setup lang="ts">
import type { TripResult } from '@ev/core'

defineProps<{
  result: TripResult | null
}>()

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) {
    return `${mins} min`
  }

  return `${hours}h ${mins}m`
}
</script>
