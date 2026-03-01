<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">Trip Details</h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Origin -->
      <div>
        <label for="origin" class="block text-sm font-medium text-gray-700">
          Origin
        </label>
        <input
          id="origin"
          v-model="input.origin"
          type="text"
          placeholder="Enter starting location"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          :aria-invalid="input.origin === ''"
        />
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
        @click="handleReset"
        class="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Reset
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useTripInput } from '../composables/useTripInput'
import { useRoutePlanning } from '../composables/useRoutePlanning'
import EVParameterInputs from './EVParameterInputs.vue'

const { input, canSubmit, validationErrors, status, updateInput, setLoading } = useTripInput()
const { planTrip, resetInput } = useRoutePlanning()

async function handleSubmit() {
  if (!canSubmit.value) return
  setLoading()
  await planTrip()
}

function handleReset() {
  resetInput()
}
</script>
