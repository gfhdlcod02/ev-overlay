# Contract: Location Store (Pinia)

**Type**: Pinia Store
**Location**: `apps/web/src/stores/location.ts`

---

## Interface

```typescript
interface LocationState {
  position: UserLocation | null;
  status: GeolocationStatus;
  error: GeolocationPositionError | null;
  hasUserInteracted: boolean;
  permission: PermissionState;
}

interface LocationActions {
  // Core actions
  setPosition(position: GeolocationPosition): void;
  setError(error: GeolocationPositionError): void;
  setStatus(status: GeolocationStatus): void;
  setPermission(permission: PermissionState): void;
  markUserInteracted(): void;
  reset(): void;

  // Computed/Getters
  readonly isLocationAvailable: boolean;
  readonly isAccurate: boolean;
  readonly locationLabel: string | null;
}

interface LocationGetters {
  isLocationAvailable: boolean;  // position !== null
  isAccurate: boolean;           // position?.accuracy <= 1000
  locationLabel: string | null;  // "Current Location" or null
  canAutoCenter: boolean;        // !hasUserInteracted && isLocationAvailable
}

const useLocationStore: StoreDefinition<'location', LocationState, LocationGetters, LocationActions>;
```

---

## State Contract

| State Key | Type | Default | Description |
|-----------|------|---------|-------------|
| `position` | `UserLocation \| null` | `null` | Last known position |
| `status` | `GeolocationStatus` | `'idle'` | Current geolocation status |
| `error` | `GeolocationPositionError \| null` | `null` | Last error (if any) |
| `hasUserInteracted` | `boolean` | `false` | User manually moved map |
| `permission` | `PermissionState` | `'prompt'` | Browser permission state |

---

## Persistence Contract

- Store syncs with `sessionStorage` key `'ev-overlay:location'`
- Only persists on `status === 'success'` or `status === 'denied'`
- Hydrates from sessionStorage on store initialization
- Clears sessionStorage on `reset()` action

---

## Action Specifications

### setPosition(position)

**Preconditions**: None
**Effects**:
- Sets `position` from GeolocationPosition
- Sets `status` to `'success'`
- Clears `error`
- Persists to sessionStorage

### setError(error)

**Preconditions**: None
**Effects**:
- Sets `error` from GeolocationPositionError
- Sets `status` based on error code:
  - `PERMISSION_DENIED` → `'denied'`
  - `POSITION_UNAVAILABLE` → `'error'`
  - `TIMEOUT` → `'timeout'`

### markUserInteracted()

**Preconditions**: None
**Effects**:
- Sets `hasUserInteracted` to `true`
- Prevents future auto-recentering

### reset()

**Preconditions**: None
**Effects**:
- Resets all state to defaults
- Clears sessionStorage

---

## Getter Specifications

| Getter | Returns | Logic |
|--------|---------|-------|
| `isLocationAvailable` | `boolean` | `position !== null` |
| `isAccurate` | `boolean` | `position !== null && position.accuracy <= 1000` |
| `locationLabel` | `string \| null` | `isLocationAvailable ? 'Current Location' : null` |
| `canAutoCenter` | `boolean` | `isLocationAvailable && !hasUserInteracted` |
