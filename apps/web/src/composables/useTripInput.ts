import { reactive, computed, type DeepReadonly } from 'vue'
import { DrivingFactor, validateEVParameters, normalizeEVParameters } from '@ev/core'
import type { TripInput, TripPlanningState } from '../types'

const defaultInput: TripInput = {
  origin: '',
  destination: '',
  socNow: 70,
  range100Km: 450,
  reserveArrival: 20,
  drivingFactor: DrivingFactor.NORMAL,
}

// Create state factory to avoid singleton issues
function createState(): TripPlanningState {
  return reactive<TripPlanningState>({
    input: { ...defaultInput },
    result: null,
    status: 'idle',
    error: null,
  })
}

// Global state for app, but fresh state for testing
const globalState = createState()

export function useTripInput() {
  // Use global state in browser, fresh state in test environment
  const state = typeof window !== 'undefined' ? globalState : createState()
  const isValid = computed(() => {
    const validation = validateEVParameters({
      socNow: state.input.socNow,
      range100Km: state.input.range100Km,
      reserveArrival: state.input.reserveArrival,
      factor: state.input.drivingFactor,
    })
    return validation.valid
  })

  const validationErrors = computed(() => {
    const validation = validateEVParameters({
      socNow: state.input.socNow,
      range100Km: state.input.range100Km,
      reserveArrival: state.input.reserveArrival,
      factor: state.input.drivingFactor,
    })
    return validation.errors
  })

  const canSubmit = computed(() => {
    return (
      isValid.value &&
      state.input.origin.trim().length > 0 &&
      state.input.destination.trim().length > 0 &&
      state.status !== 'loading'
    )
  })

  const evParams = computed(() => {
    return normalizeEVParameters({
      socNow: state.input.socNow ?? 0,
      range100Km: state.input.range100Km ?? 0,
      reserveArrival: state.input.reserveArrival,
      factor: state.input.drivingFactor,
    })
  })

  function updateInput<K extends keyof TripInput>(field: K, value: TripInput[K]): void {
    state.input[field] = value
    // Clear error when input changes
    if (state.error) {
      state.error = null
    }
  }

  function resetInput(): void {
    Object.assign(state.input, defaultInput)
    state.result = null
    state.error = null
    state.status = 'idle'
  }

  function setResult(result: TripPlanningState['result']): void {
    state.result = result
    state.status = result ? 'success' : 'idle'
  }

  function setLoading(): void {
    state.status = 'loading'
    state.error = null
  }

  function setError(error: TripPlanningState['error']): void {
    state.error = error
    state.status = 'error'
  }

  return {
    input: computed(() => state.input as DeepReadonly<TripInput>),
    result: computed(() => state.result),
    status: computed(() => state.status),
    error: computed(() => state.error),
    isValid,
    validationErrors,
    canSubmit,
    evParams,
    updateInput,
    resetInput,
    setResult,
    setLoading,
    setError,
  }
}
