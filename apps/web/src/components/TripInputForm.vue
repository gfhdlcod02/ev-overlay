<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Trip Details</h2>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Origin -->
      <div>
        <label for="origin" class="block text-sm font-medium text-gray-700"> Origin </label>
        <div class="relative mt-1">
          <input
            id="origin"
            v-model="input.origin"
            type="text"
            :placeholder="originPlaceholder"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
            :aria-invalid="input.origin === ''"
            :disabled="isLocating"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
          />
          <!-- Loading spinner -->
          <div
            v-if="isLocating"
            class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
          >
            <svg
              class="animate-spin h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <!-- Checkmark for current location -->
          <div
            v-else-if="isCurrentLocation"
            class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
            title="Using your current location"
          >
            <svg
              class="h-5 w-5 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
        <!-- Error notice -->
        <p v-if="locationError" class="mt-1 text-sm text-amber-600">
          {{ locationError }}
        </p>
      </div>

      <!-- Destination -->
      <div>
        <label for="destination" class="block text-sm font-medium text-gray-700">
          Destination
        </label>
        <input
          id="destination"
          v-model="input.destination"
          type="text"
          placeholder="Enter destination"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          :aria-invalid="input.destination === ''"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        />
      </div>

      <!-- EV Parameters -->
      <EVParameterInputs
        :soc-now="input.socNow"
        :range100-km="input.range100Km"
        :reserve-arrival="input.reserveArrival"
        :driving-factor="input.drivingFactor"
        @update:soc-now="v => updateInput('socNow', v)"
        @update:range100-km="v => updateInput('range100Km', v)"
        @update:reserve-arrival="v => updateInput('reserveArrival', v)"
        @update:driving-factor="v => updateInput('drivingFactor', v)"
      />

      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="rounded-md bg-red-50 p-3">
        <ul class="text-sm text-red-700 space-y-1">
          <li v-for="error in validationErrors" :key="error">{{ error }}</li>
        </ul>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="!canSubmit"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        aria-label="Plan trip"
      >
        <span v-if="status === 'loading'">Planning...</span>
        <span v-else>Plan Trip</span>
      </button>

      <!-- Reset Button -->
      <button
        type="button"
        class="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        @click="handleReset"
      >
        Reset
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTripInput } from '../composables/useTripInput'
import { useRoutePlanning } from '../composables/useRoutePlanning'
import { useLocationStore } from '../stores/location'
import { formatCoordinatePair } from '../utils/coordinates'
import EVParameterInputs from './EVParameterInputs.vue'

const { input, canSubmit, validationErrors, status, updateInput, resetInput, setLoading } =
  useTripInput()
const { planTrip, resetInput: resetRoutePlanning } = useRoutePlanning()
const locationStore = useLocationStore()

// Computed properties for geolocation UI
const isLocating = computed(() => locationStore.status === 'loading')
const isCurrentLocation = computed(() => {
  return (
    locationStore.isLocationAvailable &&
    input.value.origin === formatLocationForInput(locationStore.position)
  )
})
const locationError = computed(() => {
  if (locationStore.status === 'denied') {
    return 'Location access denied. Enter address manually.'
  }
  if (locationStore.status === 'error' && locationStore.error) {
    return 'Could not get location. Enter address manually.'
  }
  return null
})

const originPlaceholder = computed(() => {
  if (isLocating.value) return 'Locating...'
  return 'Enter starting location'
})

/**
 * Format a UserLocation for input field display
 * Returns "lat,lng" format for precise coordinates
 * Uses dot as decimal separator regardless of locale
 */
function formatLocationForInput(position: { lat: number; lng: number } | null): string {
  if (!position) return ''
  return formatCoordinatePair(position.lat, position.lng)
}

/**
 * Watch for location changes and auto-populate origin when available
 * Only populates if:
 * - Origin is currently empty
 * - Location is accurate (<= 1000m)
 * - Permission is granted
 */
watch(
  () => locationStore.position,
  newPosition => {
    if (newPosition && locationStore.isAccurate && input.value.origin === '') {
      const locationString = formatLocationForInput(newPosition)
      updateInput('origin', locationString)
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (!canSubmit.value) return
  setLoading()
  await planTrip()
}

function handleReset() {
  resetInput()
  resetRoutePlanning()
}
</script>
