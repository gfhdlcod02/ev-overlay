<template>
  <div
    v-if="error"
    class="rounded-md bg-red-50 p-4 border border-red-200"
    role="alert"
    aria-live="assertive"
  >
    <div class="flex">
      <div class="flex-shrink-0">
        <svg
          class="h-5 w-5 text-red-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">
          {{ errorTitle }}
        </h3>
        <div class="mt-2 text-sm text-red-700">
          <p>{{ error.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteError } from '@/types'

const props = defineProps<{
  error: RouteError | null
}>()

const errorTitle = computed(() => {
  if (!props.error) return ''

  switch (props.error.code) {
    case 'INVALID_PARAMS':
      return 'Invalid Input'
    case 'NO_ROUTE':
      return 'No Route Found'
    case 'TOO_MANY_STOPS':
      return 'Too Many Stops Required'
    case 'PROVIDER_ERROR':
    case 'PLAN_FAILED':
      return 'Service Error'
    default:
      return 'Error'
  }
})
</script>
