# Data Model: Smart EV Overlay

**Feature**: 001-smart-ev-overlay
**Date**: 2026-02-28

## Entity Overview

```
┌─────────────┐     ┌─────────────┐
│  TripInput  │────>│EVParameters │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Route    │
                    └─────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  SafeRange  │ │ChargingStop │ │RouteSegment │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Entities

### TripInput

Raw user input before validation.

| Field | Type | Description |
|-------|------|-------------|
| origin | string | Free-text origin (address or place name) |
| destination | string | Free-text destination (address or place name) |
| socNow | number | Current state of charge (0-100) |
| range100Km | number | Vehicle range at 100% charge (km) |
| reserveArrival | number | Minimum charge on arrival (0-50, default 20) |
| drivingFactor | DrivingFactor | Eco=1.05, Normal=1.15, Highway=1.25 |

### EVParameters

Validated and normalized trip settings.

| Field | Type | Constraints |
|-------|------|-------------|
| socNow | number | 0 ≤ socNow ≤ 100 |
| range100Km | number | range100Km > 0 |
| reserveArrival | number | 0 ≤ reserveArrival ≤ 50 |
| factor | number | factor ≥ 1.0 |

**Validation Rules**:
- socNow > reserveArrival (otherwise error: insufficient charge)
- All numeric fields must be finite numbers

### Location

Geographic coordinate.

| Field | Type | Description |
|-------|------|-------------|
| lat | number | Latitude (-90 to 90) |
| lng | number | Longitude (-180 to 180) |
| address | string? | Human-readable address (optional) |

**Coordinate Format**:
- Free-text: Full address strings (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
- Lat/Lng: Decimal degrees with comma separator, latitude range [-90, 90], longitude range [-180, 180]
- Examples: "37.7749,-122.4194", "40.7128, -74.0060" (whitespace optional)

### Route

Provider response with normalized geometry.

| Field | Type | Description |
|-------|------|-------------|
| origin | Location | Start point (geocoded) |
| destination | Location | End point (geocoded) |
| distanceKm | number | Total route distance in kilometers |
| durationMin | number | Estimated duration in minutes |
| geometry | LineString | GeoJSON LineString of route path |

**Geometry Format** (GeoJSON):
```json
{
  "type": "LineString",
  "coordinates": [[lng, lat], [lng, lat], ...]
}
```

### SafeRange

Calculated safe driving distance.

| Field | Type | Description |
|-------|------|-------------|
| safeRangeKm | number | Maximum safe distance: `((socNow - reserve)/100) * (range100 / factor)` |
| effectiveRangeKm | number | Range adjusted for driving factor: `range100 / factor` |
| bufferKm | number | Safety buffer applied (default 10) |
| thresholdKm | number | Stop placement threshold: `safeRangeKm - bufferKm` |

### ChargingStop

Suggested virtual charging location.

| Field | Type | Description |
|-------|------|-------------|
| sequence | number | Stop order (1-based) |
| position | Location | Coordinate along route |
| distanceFromStartKm | number | Cumulative distance to this stop |
| arrivalChargePercent | number | Estimated charge on arrival |
| chargeToPercent | number | Assumed charge level after stop (default 80) |
| distanceToNextKm | number | Distance to next stop or destination |

**Stop Placement Algorithm**:
1. Accumulate route distance from origin
2. When accumulated >= thresholdKm, place stop
3. After stop, reset accumulated distance to 0
4. Assume 80% charge for next leg calculation
5. Repeat until destination reached
6. Max 5 stops (error if more needed)

### RouteSegment

Portion of route with safety status for visualization.

| Field | Type | Description |
|-------|------|-------------|
| startIdx | number | Index into route geometry coordinates |
| endIdx | number | Index into route geometry coordinates |
| startKm | number | Cumulative distance at segment start |
| endKm | number | Cumulative distance at segment end |
| status | 'safe' \| 'risky' | Visual safety classification |
| color | string | Hex color code (#22c55e safe, #ef4444 risky) |

**Segment Classification**:
- Safe: `endKm <= currentSafeRangeKm` for current leg
- Risky: `endKm > currentSafeRangeKm`

### TripResult

Complete planning result.

| Field | Type | Description |
|-------|------|-------------|
| input | EVParameters | Original validated input |
| route | Route | Full route with geometry |
| safeRange | SafeRange | Calculated safe range |
| stops | ChargingStop[] | Suggested charging stops (0-5) |
| segments | RouteSegment[] | Visual segments with safety status |
| googleMapsUrl | string | Generated navigation URL |
| totalDistanceKm | number | Total trip distance |
| totalDurationMin | number | Total estimated duration |
| reachable | boolean | True if stops allow reaching destination above reserve |

## Enums

### DrivingFactor

```typescript
enum DrivingFactor {
  ECO = 1.05,      // City driving, efficient speed
  NORMAL = 1.15,   // Mixed driving
  HIGHWAY = 1.25   // High speed, HVAC usage
}
```

## Value Objects

### LineString

GeoJSON LineString for route geometry.

```typescript
type LineString = {
  type: 'LineString'
  coordinates: [number, number][] // [lng, lat] pairs
}
```

### OSRMResponse (External)

Raw OSRM API response shape (normalized to internal Route).

```typescript
type OSRMResponse = {
  code: 'Ok' | string
  routes: Array<{
    distance: number // meters
    duration: number // seconds
    geometry: string // polyline encoded
  }>
}
```

## State Transitions

### Trip Planning Flow

```
[TripInput] --validate()--> [EVParameters] --calculate()--> [TripResult]
     │                                                        │
     │                                                        │
     ▼                                                        ▼
[ValidationError]                                    [display overlay]
                                                            │
                                                            ▼
                                                    [Google Maps handoff]
```

### Cache Lookup Flow

```
[origin, destination] --hash()--> [cache key] --lookup()-->
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                        [HIT]             [MISS]
                          │                 │
                          ▼                 ▼
                    [return Route]    [fetch OSRM]
                                          │
                                          ▼
                                    [normalize]
                                          │
                                          ▼
                                    [cache & return]
```

## Validation Rules

### Input Validation

| Field | Min | Max | Required |
|-------|-----|-----|----------|
| socNow | 0 | 100 | Yes |
| range100Km | 0.1 | 2000 | Yes |
| reserveArrival | 0 | 50 | Yes |
| factor | 1.0 | 3.0 | Yes |

### Business Rules

1. **Insufficient Charge**: If `socNow <= reserveArrival`, trip cannot be planned
2. **Max Stops**: If more than 5 stops required, return error with suggestion to increase charge or reduce reserve
3. **Negative Range**: All distance calculations must result in positive values
4. **Coordinate Bounds**: Lat must be [-90, 90], Lng must be [-180, 180]

## Key Calculations

### Safe Range Formula

```
safeRangeKm = ((socNow - reserveArrival) / 100) * (range100Km / factor)
```

### Stop Placement Threshold

```
thresholdKm = safeRangeKm - bufferKm
```

### Charge on Arrival

```
arrivalCharge = reserveArrival + (remainingRange / effectiveRangeKm) * (socNow - reserveArrival)
```

### Distance Accumulation

```typescript
function accumulateDistance(geometry: LineString): number[] {
  // Returns array of cumulative distances at each coordinate
  // Uses Haversine formula between consecutive points
}
```
