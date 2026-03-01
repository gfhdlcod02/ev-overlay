# Smart EV Overlay - Architecture Documentation

## Overview

Smart EV Overlay is a Cloudflare-first web application for EV trip planning. This document describes the technical architecture, design decisions, and system components.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Vue 3 SPA                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Trip Input  │  │  Route Map  │  │ Charging Stops  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                    HTTP / JSON                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Cloudflare    │
                    │    Workers     │
                    │  ┌──────────┐  │
                    │  │  /api/   │  │
                    │  │  route   │  │
                    │  └────┬─────┘  │
                    │       │        │
                    │  ┌────▼────┐   │
                    │  │  KV     │   │
                    │  │ Cache   │   │
                    │  └─────────┘   │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │      OSRM      │
                    │ (Open Source   │
                    │ Routing Mach.) │
                    └────────────────┘
```

## Component Architecture

### 1. packages/core - Business Logic Layer

**Purpose**: Pure deterministic TypeScript logic with zero external dependencies.

**Key Modules**:

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `calculator/safe-range.ts` | Safe range calculation | `calculateSafeRange()` |
| `calculator/stop-placement.ts` | Charging stop placement | `calculateChargingStops()` |
| `calculator/segment-builder.ts` | Safe/risky segment classification | `buildRouteSegments()` |
| `url-builder/google-maps.ts` | URL generation | `buildGoogleMapsUrl()` |
| `validators/ev-validation.ts` | Input validation | `validateEVParameters()` |
| `utils/haversine.ts` | Distance calculation | `haversineDistance()` |

**Design Principles**:
- Pure functions only (no side effects)
- No browser or Node.js API dependencies
- 100% unit test coverage
- Deterministic outputs for same inputs

**Example - Safe Range Calculation**:
```typescript
// Formula: safeRangeKm = ((socNow - reserveArrival)/100) * (range100Km / factor)
export function calculateSafeRange(params: EVParameters): SafeRange {
  const effectiveRangeKm = range100Km / factor
  const usableChargePercent = socNow - reserveArrival
  const safeRangeKm = (usableChargePercent / 100) * effectiveRangeKm
  return { safeRangeKm, effectiveRangeKm, bufferKm, thresholdKm }
}
```

### 2. apps/web - Presentation Layer

**Purpose**: Vue 3 single-page application for user interaction.

**Key Components**:

| Component | Responsibility |
|-----------|--------------|
| `TripInputForm.vue` | Origin/destination and EV parameter inputs |
| `EVParameterInputs.vue` | Sliders for SoC, range, reserve, driving factor |
| `RouteMap.vue` | Leaflet map with route polyline and stop markers |
| `ChargingStopList.vue` | Sidebar list of suggested stops |
| `TripSummary.vue` | Distance, duration, safe range display |
| `ErrorDisplay.vue` | User-friendly error messages |
| `LoadingState.vue` | Loading indicators |

**Composables**:

| Composable | Purpose |
|------------|---------|
| `useTripInput.ts` | Reactive trip input state |
| `useRoutePlanning.ts` | Route fetching and result state |

**Design Principles**:
- No direct calls to routing providers (always through Worker)
- Client-side recalculation when EV params change (no re-fetch)
- Responsive design (mobile-first)
- WCAG 2.1 AA accessibility compliance

### 3. workers/api - Edge API Layer

**Purpose**: Cloudflare Worker for route proxying and caching.

**Key Modules**:

| Module | Responsibility |
|--------|---------------|
| `handlers/route.ts` | `/api/route` endpoint implementation |
| `handlers/cors.ts` | CORS preflight handling |
| `providers/osrm-client.ts` | OSRM API client with timeouts |
| `providers/normalize.ts` | OSRM response normalization |
| `cache/kv-cache.ts` | KV read/write with TTL |

**API Endpoints**:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/route` | GET | Fetch route with caching |

**Query Parameters**:
- `origin`: `lat,lng` format
- `destination`: `lat,lng` format

**Caching Strategy**:
- Cache key: SHA-256 hash of coordinates (rounded to 4 decimals)
- TTL: 7 days
- Cache headers: `X-Cache: HIT/MISS`

**Design Principles**:
- Secrets remain server-side only
- Normalize provider responses to stable schema
- Handle timeouts and retries
- Input validation at edge

## Data Flow

### 1. Trip Planning Flow

```
User Input (origin, destination, EV params)
    ↓
[apps/web] Validation (client-side)
    ↓
[apps/web] Geocoding (if address)
    ↓
[workers/api] GET /api/route?origin=...&destination=...
    ↓
[workers/api] Check KV cache
    ↓
(MISS) → [OSRM] Fetch route
    ↓
[workers/api] Normalize response
    ↓
[workers/api] Cache in KV
    ↓
[apps/web] Receive route geometry
    ↓
[packages/core] Calculate safe range
    ↓
[packages/core] Calculate charging stops
    ↓
[packages/core] Build route segments
    ↓
[apps/web] Render map with overlays
```

### 2. EV Parameter Update Flow

```
User changes EV parameter (SoC, range, etc.)
    ↓
[apps/web] No re-fetch (route geometry cached)
    ↓
[packages/core] Recalculate safe range
    ↓
[packages/core] Recalculate stops
    ↓
[packages/core] Rebuild segments
    ↓
[apps/web] Update map overlay
```

### 3. Google Maps Handoff Flow

```
User clicks "Open in Google Maps"
    ↓
[packages/core] buildGoogleMapsUrl()
    ↓
Generate URL with waypoints
    ↓
Open in new tab / app
```

## Data Models

### Core Entities

```typescript
// Validated EV parameters
interface EVParameters {
  socNow: number           // Current charge (0-100)
  range100Km: number       // Range at 100% (km)
  reserveArrival: number   // Reserve on arrival (0-50, default 20)
  factor: number           // Driving factor (>= 1.0)
}

// Calculated safe range
interface SafeRange {
  safeRangeKm: number      // Maximum safe distance
  effectiveRangeKm: number // Range adjusted for factor
  bufferKm: number         // Safety buffer (default 10)
  thresholdKm: number      // Stop placement threshold
}

// Route from provider
interface Route {
  origin: Location
  destination: Location
  distanceKm: number
  durationMin: number
  geometry: LineString    // GeoJSON
}

// Charging stop suggestion
interface ChargingStop {
  sequence: number
  position: Location
  distanceFromStartKm: number
  arrivalChargePercent: number
  chargeToPercent: number
  distanceToNextKm: number
}

// Route segment for visualization
interface RouteSegment {
  startIdx: number
  endIdx: number
  startKm: number
  endKm: number
  status: 'safe' | 'risky'
  color: string
}
```

## Error Handling

### Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| Validation | Invalid coordinates, out of range | Client-side with clear messages |
| Network | Timeout, connection failed | Retry with exponential backoff |
| Provider | OSRM unavailable, no route | User-friendly error with retry button |
| Business | Insufficient charge, max stops exceeded | Clear guidance to user |

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_CHARGE",
    "message": "Current charge must be greater than reserve arrival charge"
  }
}
```

## Security Considerations

### Input Validation

- Coordinate bounds: lat [-90, 90], lng [-180, 180]
- Numeric ranges enforced at all entry points
- String sanitization for addresses

### CORS

```typescript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Data Privacy

- No PII collection
- Location data not persisted (only route geometry cached)
- No logging of origin/destination coordinates

### Secrets Management

- OSRM base URL configurable via environment
- No API keys in client bundle
- Worker-only secrets

## Performance Optimizations

### Caching

| Cache | TTL | Purpose |
|-------|-----|---------|
| KV Route Cache | 7 days | Avoid re-fetching same routes |
| Browser Cache | - | Static assets |

### Bundle Optimization

- Tree-shaking enabled
- Dynamic imports where applicable
- Minimal dependencies in `packages/core`

### Computation

- Client-side recalculation (no server round-trip for EV param changes)
- Efficient distance accumulation algorithms
- Lazy loading of map components

## Testing Strategy

### Test Pyramid

```
       /\
      /  \
     / E2E\      (Playwright) - Critical user journeys
    /________\
   /          \
  / Integration\  (10 tests) - Worker with cache
 /______________\
/                \
/     Unit       \  (85 tests) - Core logic
/__________________\
```

### Test Coverage

- **Unit**: 100% coverage on `packages/core`
- **Integration**: Worker route endpoint, cache hit/miss
- **E2E**: Complete user flows with mocked APIs

## Deployment Architecture

### Cloudflare Infrastructure

```
Cloudflare Pages (apps/web)
    └── Global CDN for static assets

Cloudflare Workers (workers/api)
    └── Edge execution in 300+ locations

Cloudflare KV (ROUTE_CACHE)
    └── Global low-latency data store
```

### Deployment Flow

```
Local Development
    ↓
Git Push
    ↓
CI/CD Pipeline
    ├── Lint & Type Check
    ├── Unit Tests
    ├── Integration Tests
    └── Build
    ↓
Deploy
    ├── Worker: wrangler deploy
    └── Web: Cloudflare Pages
```

## Future Considerations

### Phase 2+ Features (Not MVP)

- Real charger POI integration
- Elevation/traffic modeling
- User accounts and saved trips
- Alternative route suggestions

### Scalability

- Current design supports single-user MVP
- KV caching reduces external API calls
- Stateless Worker design allows horizontal scaling

## References

- [Constitution](.specify/memory/constitution.md) - Project principles
- [Specification](specs/001-smart-ev-overlay/spec.md) - Feature requirements
- [Data Model](specs/001-smart-ev-overlay/data-model.md) - Entity definitions
- [API Contract](specs/001-smart-ev-overlay/contracts/route-api.md) - API specification
