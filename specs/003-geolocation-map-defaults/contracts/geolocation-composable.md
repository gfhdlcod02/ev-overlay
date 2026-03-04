# Contract: useGeolocation Composable

**Type**: Vue 3 Composable
**Location**: `apps/web/src/composables/useGeolocation.ts`

---

## Interface

```typescript
interface UseGeolocationOptions {
  timeout?: number // Default: 5000 (ms)
  accuracyThreshold?: number // Default: 1000 (meters)
}

interface UseGeolocationReturn {
  // State (readonly)
  readonly position: UserLocation | null
  readonly status: GeolocationStatus
  readonly error: GeolocationError | null
  readonly isLoading: boolean
  readonly isGranted: boolean
  readonly isDenied: boolean

  // Actions
  requestLocation: () => Promise<void>
  clearLocation: () => void
}

function useGeolocation(options?: UseGeolocationOptions): UseGeolocationReturn
```

---

## Behavior Contract

### Initialization

- Returns current state from Pinia store
- Does not automatically request location on creation
- Reactive to store changes

### requestLocation()

1. Sets status to `LOADING`
2. Calls `navigator.geolocation.getCurrentPosition()`
3. On success with accuracy <= threshold:
   - Updates store with position
   - Sets status to `SUCCESS`
4. On success with accuracy > threshold:
   - Treats as error (insufficient accuracy)
   - Sets status to `ERROR`
5. On permission denied:
   - Sets status to `DENIED`
6. On timeout:
   - Sets status to `TIMEOUT`

### clearLocation()

- Resets position to `null`
- Resets status to `IDLE`
- Clears error state

---

## Usage Example

```vue
<script setup>
import { useGeolocation } from '@/composables/useGeolocation'

const { position, status, isLoading, requestLocation } = useGeolocation({
  timeout: 5000,
  accuracyThreshold: 1000,
})
</script>

<template>
  <div>
    <button @click="requestLocation" :disabled="isLoading">
      {{ isLoading ? 'Locating...' : 'Use My Location' }}
    </button>
    <span v-if="position">Location: {{ position.lat }}, {{ position.lng }}</span>
  </div>
</template>
```
