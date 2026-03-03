# Data Model: Geolocation Map Defaults

**Feature**: 003-geolocation-map-defaults
**Date**: 2026-03-03

---

## Entities

### UserLocation

Represents the geographic position of the user with metadata.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `lat` | `number` | Latitude in decimal degrees | -90 to 90 |
| `lng` | `number` | Longitude in decimal degrees | -180 to 180 |
| `accuracy` | `number` | Accuracy radius in meters | >= 0 |
| `timestamp` | `number` | Unix timestamp of reading | >= 0 |

### MapViewState

Represents the current viewport configuration of the map.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `center` | `[number, number]` | [lat, lng] center point | Valid coordinates |
| `zoom` | `number` | Zoom level | 1-20 typical for Leaflet |
| `isDefault` | `boolean` | Whether showing default (Thailand) view | - |
| `hasUserInteracted` | `boolean` | Whether user manually panned/zoomed | - |

### OriginInput

Represents the starting point selection state.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `value` | `UserLocation \| null` | Selected location or null | - |
| `label` | `string` | Display label ("Current Location" or address) | Non-empty if value set |
| `source` | `'geolocation' \| 'manual' \| null` | How the value was set | Enum |

### GeolocationState (Pinia Store State)

Complete state managed by the geolocation store.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `GeolocationStatus` | Current status of geolocation request |
| `position` | `UserLocation \| null` | Last known position |
| `error` | `GeolocationError \| null` | Error details if failed |
| `permission` | `PermissionState` | Browser permission state |

### Enums

```typescript
enum GeolocationStatus {
  IDLE = 'idle',           // Initial state
  LOADING = 'loading',     // Request in progress
  SUCCESS = 'success',     // Position obtained
  ERROR = 'error',         // Technical error
  DENIED = 'denied',       // Permission denied
  TIMEOUT = 'timeout'      // Request timed out
}

enum PermissionState {
  PROMPT = 'prompt',       // Not yet requested
  GRANTED = 'granted',     // Permission granted
  DENIED = 'denied'        // Permission denied
}
```

---

## State Transitions

### Geolocation Status Flow

```
[IDLE] --request()--> [LOADING] --success--> [SUCCESS]
                              |
                              |--error--> [ERROR]
                              |
                              |--denied--> [DENIED]
                              |
                              |--timeout--> [TIMEOUT]
```

### Map View Transitions

```
[Thailand Default] --geolocation success + no interaction--> [User Location]
                                                           |
[Thailand Default] --user interaction--> [Manual View] <--|
```

### Origin Input Transitions

```
[Empty] --geolocation granted + accurate--> [Auto-populated: Current Location]
      |
      |--manual entry--> [Manual Location]
      |
      |--geolocation denied/timeout--> [Empty with placeholder]
```

---

## Session Storage Schema

```typescript
interface SessionStoredLocation {
  v: 1;                          // Schema version
  lat: number;
  lng: number;
  accuracy: number;
  status: 'granted' | 'denied';
  savedAt: number;               // Unix timestamp
}

// Key: 'ev-overlay:location'
// Scope: sessionStorage (cleared on tab close)
```

---

## Validation Rules

### Coordinate Validation

- Latitude: Must be between -90 and 90 inclusive
- Longitude: Must be between -180 and 180 inclusive
- Accuracy: Must be a positive number (0 or greater)

### Business Rules

1. **Accuracy Threshold**: Positions with `accuracy > 1000m` are treated as invalid for auto-population
2. **Timeout**: Geolocation requests timeout after 5000ms (5 seconds)
3. **User Interaction**: Once `hasUserInteracted` is true, auto-recentering is disabled
4. **Session Persistence**: Location data only persists within the browser session (sessionStorage)

---

## Default Values

| Entity | Field | Default Value |
|--------|-------|---------------|
| MapViewState | `center` | `[13.7563, 100.5018]` (Bangkok) |
| MapViewState | `zoom` | `6` |
| MapViewState | `isDefault` | `true` |
| MapViewState | `hasUserInteracted` | `false` |
| GeolocationState | `status` | `IDLE` |
| OriginInput | `source` | `null` |
