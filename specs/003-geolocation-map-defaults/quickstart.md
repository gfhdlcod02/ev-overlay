# Quickstart: Geolocation Map Defaults

**Feature**: 003-geolocation-map-defaults
**Date**: 2026-03-03

---

## Development Setup

No additional dependencies required. Uses native browser APIs.

---

## Implementation Order

### Step 1: Create Geolocation Composable

**File**: `apps/web/src/composables/useGeolocation.ts`

Create the composable that wraps the native Geolocation API:

```typescript
import { computed } from 'vue';
import { useLocationStore } from '@/stores/location';
import type { UserLocation, GeolocationStatus } from '@/types/location';

export interface UseGeolocationOptions {
  timeout?: number;
  accuracyThreshold?: number;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    timeout = 5000,
    accuracyThreshold = 1000
  } = options;

  const store = useLocationStore();

  const requestLocation = async (): Promise<void> => {
    if (!navigator.geolocation) {
      store.setError({ code: 2, message: 'Geolocation not supported' } as GeolocationPositionError);
      return;
    }

    store.setStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy <= accuracyThreshold) {
          store.setPosition(position);
        } else {
          store.setError({ code: 2, message: 'Insufficient accuracy' } as GeolocationPositionError);
        }
      },
      (error) => store.setError(error),
      { timeout, enableHighAccuracy: false }
    );
  };

  return {
    position: computed(() => store.position),
    status: computed(() => store.status),
    isLoading: computed(() => store.status === 'loading'),
    isGranted: computed(() => store.status === 'success'),
    isDenied: computed(() => store.status === 'denied'),
    requestLocation,
    clearLocation: store.reset
  };
}
```

### Step 2: Create/Update Location Store

**File**: `apps/web/src/stores/location.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserLocation, GeolocationStatus, PermissionState } from '@/types/location';

const STORAGE_KEY = 'ev-overlay:location';

export const useLocationStore = defineStore('location', () => {
  // State
  const position = ref<UserLocation | null>(null);
  const status = ref<GeolocationStatus>('idle');
  const error = ref<GeolocationPositionError | null>(null);
  const hasUserInteracted = ref(false);
  const permission = ref<PermissionState>('prompt');

  // Getters
  const isLocationAvailable = computed(() => position.value !== null);
  const isAccurate = computed(() =>
    position.value !== null && position.value.accuracy <= 1000
  );
  const locationLabel = computed(() =>
    isLocationAvailable.value ? 'Current Location' : null
  );
  const canAutoCenter = computed(() =>
    isLocationAvailable.value && !hasUserInteracted.value
  );

  // Actions
  function setPosition(geoPosition: GeolocationPosition) {
    position.value = {
      lat: geoPosition.coords.latitude,
      lng: geoPosition.coords.longitude,
      accuracy: geoPosition.coords.accuracy,
      timestamp: geoPosition.timestamp
    };
    status.value = 'success';
    error.value = null;
    saveToStorage();
  }

  function setError(err: GeolocationPositionError) {
    error.value = err;
    switch (err.code) {
      case 1: status.value = 'denied'; break;
      case 2: status.value = 'error'; break;
      case 3: status.value = 'timeout'; break;
    }
  }

  function setStatus(newStatus: GeolocationStatus) {
    status.value = newStatus;
  }

  function markUserInteracted() {
    hasUserInteracted.value = true;
  }

  function reset() {
    position.value = null;
    status.value = 'idle';
    error.value = null;
    hasUserInteracted.value = false;
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function saveToStorage() {
    if (position.value && (status.value === 'success' || status.value === 'denied')) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: 1,
        lat: position.value.lat,
        lng: position.value.lng,
        accuracy: position.value.accuracy,
        status: status.value,
        savedAt: Date.now()
      }));
    }
  }

  // Hydrate from storage on init
  function hydrateFromStorage() {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.v === 1) {
          position.value = {
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy,
            timestamp: data.savedAt
          };
          status.value = data.status;
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  hydrateFromStorage();

  return {
    position,
    status,
    error,
    hasUserInteracted,
    permission,
    isLocationAvailable,
    isAccurate,
    locationLabel,
    canAutoCenter,
    setPosition,
    setError,
    setStatus,
    markUserInteracted,
    reset
  };
});
```

### Step 3: Update Map Component

**File**: `apps/web/src/components/map/MapView.vue`

Add default view and auto-recenter logic:

```typescript
// Add to script setup
import { useLocationStore } from '@/stores/location';
import { watch, onMounted } from 'vue';

const THAILAND_DEFAULT = {
  center: [13.7563, 100.5018] as [number, number],
  zoom: 6
};

const locationStore = useLocationStore();

// Initialize map with Thailand default
onMounted(() => {
  map.setView(THAILAND_DEFAULT.center, THAILAND_DEFAULT.zoom);
});

// Watch for location changes and auto-center
watch(() => locationStore.canAutoCenter, (canAutoCenter) => {
  if (canAutoCenter && locationStore.position) {
    const { lat, lng } = locationStore.position;
    map.flyTo([lat, lng], 13, { duration: 1.5 });
  }
});

// Track user interaction
map.on('movestart zoomstart', () => {
  locationStore.markUserInteracted();
});
```

### Step 4: Update Route Planner Origin Field

**File**: `apps/web/src/views/RoutePlanner.vue` or relevant component

```vue
<template>
  <div class="origin-field">
    <label>Origin</label>
    <input
      :value="originLabel"
      :placeholder="locationStore.status === 'loading' ? 'Locating...' : 'Enter origin'"
      @focus="onOriginFocus"
    />
    <span v-if="locationStore.isLoading" class="spinner"></span>
    <button
      v-if="!locationStore.isLocationAvailable"
      @click="requestLocation"
      :disabled="locationStore.isLoading"
    >
      Use My Location
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useLocationStore } from '@/stores/location';
import { useGeolocation } from '@/composables/useGeolocation';

const locationStore = useLocationStore();
const { requestLocation } = useGeolocation();

const originLabel = computed(() => {
  if (locationStore.locationLabel) {
    return locationStore.locationLabel;
  }
  return '';
});

// Auto-request on mount
onMounted(() => {
  if (locationStore.status === 'idle') {
    requestLocation();
  }
});
</script>
```

---

## Testing Locally

### Test: Permission Granted

1. Open browser dev tools
2. Click the location permission icon in address bar
3. Set to "Allow"
4. Refresh page
5. **Expected**: Origin auto-populates, map recenters to your location

### Test: Permission Denied

1. Set location permission to "Block"
2. Refresh page
3. **Expected**: Map stays on Thailand, Origin shows placeholder

### Test: Manual Map Interaction

1. Allow location permission
2. Immediately pan the map before geolocation completes
3. **Expected**: Map stays where you panned, doesn't auto-recenter

### Test: Session Persistence

1. Allow location
2. Refresh page
3. **Expected**: No new permission prompt, uses cached location

---

## E2E Test Requirements

Create `apps/web/e2e/geolocation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Geolocation defaults', () => {
  test('shows Thailand default on load', async ({ page }) => {
    await page.goto('/route');
    // Verify map is centered on Thailand (approximate check)
    const mapCenter = await page.evaluate(() => window.map.getCenter());
    expect(mapCenter.lat).toBeCloseTo(13.75, 0);
    expect(mapCenter.lng).toBeCloseTo(100.50, 0);
  });

  test('auto-populates origin when permission granted', async ({ page, context }) => {
    // Grant permission
    await context.grantPermissions(['geolocation']);
    await page.goto('/route');

    // Mock geolocation
    await page.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: { latitude: 13.7, longitude: 100.5, accuracy: 100 },
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });

    await expect(page.locator('[data-testid="origin-input"]')).toHaveValue('Current Location');
  });
});
```
