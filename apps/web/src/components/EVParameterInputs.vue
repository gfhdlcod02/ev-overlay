<template>
  <div class="space-y-4">
    <h3 class="text-sm font-medium text-gray-700">EV Parameters</h3>

    <!-- State of Charge -->
    <div>
      <label for="soc" class="block text-xs text-gray-600"> Current Charge: {{ socNow }}% </label>
      <input
        id="soc"
        :value="socNow"
        type="range"
        min="0"
        max="100"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        @input="$emit('update:socNow', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>

    <!-- Range at 100% -->
    <div>
      <label for="range" class="block text-xs text-gray-600">
        Range at 100%: {{ range100Km }} km
      </label>
      <input
        id="range"
        :value="range100Km"
        type="range"
        min="100"
        max="800"
        step="10"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        @input="$emit('update:range100Km', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="flex justify-between text-xs text-gray-500">
        <span>100 km</span>
        <span>800 km</span>
      </div>
    </div>

    <!-- Reserve on Arrival -->
    <div>
      <label for="reserve" class="block text-xs text-gray-600">
        Reserve on Arrival: {{ reserveArrival }}%
      </label>
      <input
        id="reserve"
        :value="reserveArrival"
        type="range"
        min="0"
        max="50"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        @input="$emit('update:reserveArrival', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span>50%</span>
      </div>
    </div>

    <!-- Driving Factor -->
    <div>
      <label for="factor" class="block text-xs text-gray-600">Driving Mode</label>
      <select
        id="factor"
        :value="drivingFactor"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        @change="$emit('update:drivingFactor', Number(($event.target as HTMLSelectElement).value))"
      >
        <option :value="DrivingFactor.ECO">Eco (City)</option>
        <option :value="DrivingFactor.NORMAL">Normal (Mixed)</option>
        <option :value="DrivingFactor.HIGHWAY">Highway (Fast)</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DrivingFactor } from '@ev/core'

defineProps<{
  socNow: number | null
  range100Km: number | null
  reserveArrival: number
  drivingFactor: number
}>()

defineEmits<{
  'update:socNow': [value: number]
  'update:range100Km': [value: number]
  'update:reserveArrival': [value: number]
  'update:drivingFactor': [value: number]
}>()
</script>
