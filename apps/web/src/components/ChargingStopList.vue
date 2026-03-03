<template>
  <div v-if="stops.length > 0" class="bg-white rounded-lg shadow p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-3">Charging Stops</h3>

    <div class="space-y-3">
      <div
        v-for="stop in stops"
        :key="stop.sequence"
        class="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
      >
        <div
          class="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm"
        >
          {{ stop.sequence }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">
            Stop {{ stop.sequence }}
          </p>
          <p class="text-xs text-gray-500">
            {{ stop.distanceFromStartKm.toFixed(1) }} km from start
          </p>
          <div class="mt-1 flex items-center space-x-4 text-xs">
            <span class="text-orange-600">
              Arrival: {{ stop.arrivalChargePercent.toFixed(1) }}%
            </span>
            <span class="text-green-600">
              Charge to: {{ stop.chargeToPercent }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <p class="text-xs text-gray-500">
        Total stops: {{ stops.length }}
        <span v-if="stops.length >= 5" class="text-orange-600 font-medium">
          (Maximum reached)
        </span>
      </p>
    </div>
  </div>

  <div v-else class="bg-green-50 rounded-lg shadow p-4">
    <div class="flex items-center space-x-2">
      <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clip-rule="evenodd"
        />
      </svg>
      <p class="text-sm font-medium text-green-800">
        No charging stops needed - destination is within safe range!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChargingStop } from '@ev/core'

defineProps<{
  stops: ChargingStop[]
}>()
</script>
