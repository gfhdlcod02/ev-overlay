# Research Findings: Smart EV Overlay

**Date**: 2026-02-28
**Feature**: 001-smart-ev-overlay

## Research Questions Answered

### 1. Routing Provider Selection

**Question**: Which routing provider should be used for the MVP?

**Decision**: Use OSRM (Open Source Routing Machine) public demo server

**Rationale**:
- Free, no API key required (aligns with zero-cost infrastructure principle)
- Returns full route geometry (LineString) needed for distance accumulation
- Supports car profile with reasonable defaults
- Public instance available at `router.project-osrm.org`
- Response format is stable and well-documented

**Alternatives Considered**:
- Mapbox Directions API: Requires API key, paid tier needed for production traffic
- Google Directions API: Requires API key, more restrictive terms for overlay use
- GraphHopper: Self-hosted option adds complexity, public API has limits

**Trade-off**: Public OSRM instance has no uptime SLA and rate limits (fair use). For MVP this is acceptable; production scaling would need dedicated instance or Mapbox integration.

### 2. Map Visualization Library

**Question**: Which map library is best for the Cloudflare Pages frontend?

**Decision**: Leaflet 1.9

**Rationale**:
- Lightweight (~40KB gzipped)
- No API key required for OpenStreetMap tiles
- Well-documented, mature ecosystem
- Works in static hosting (Cloudflare Pages)
- Easy polyline styling for safe/risky segments
- Mobile-friendly touch interactions

**Alternatives Considered**:
- Mapbox GL JS: Requires API key, heavier bundle, more complex for simple overlays
- Google Maps JavaScript API: Requires API key, stricter usage terms, heavier bundle
- OpenLayers: More powerful but steeper learning curve, larger bundle

### 3. State Management Approach

**Question**: How should frontend state be managed?

**Decision**: Vue 3 Composition API with `reactive()` for global state

**Rationale**:
- Sufficient complexity for single-page application
- No additional dependencies needed
- Easy to reason about for this use case
- Can extract to composables for reusability

**Pattern**:
```typescript
// stores/trip.ts
const tripState = reactive<TripState>({...})
export const useTripStore = () => tripState
```

**Alternatives Considered**:
- Pinia: Excellent but adds dependency; overkill for MVP scope
- Vuex: Legacy, Composition API preferred for Vue 3

### 4. Package Manager & Monorepo

**Question**: How should the monorepo be structured?

**Decision**: pnpm with workspaces

**Rationale**:
- Efficient disk usage with content-addressable store
- Built-in workspace support
- Fast install times
- Excellent TypeScript monorepo support

**Workspace Configuration**:
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'workers/*'
```

### 5. CSS/Styling Framework

**Question**: How should the UI be styled?

**Decision**: Tailwind CSS

**Rationale**:
- Rapid development with utility classes
- Built-in accessibility utilities (screen reader helpers, focus states)
- Small production bundle (purges unused styles)
- Responsive design utilities for mobile/desktop
- No runtime JavaScript (unlike component libraries)

**Alternatives Considered**:
- Vanilla CSS: More manual work for responsive design
- Bootstrap: Component-based, heavier, less flexible
- UnoCSS: Similar to Tailwind, less mature ecosystem

### 6. Testing Strategy

**Question**: What testing approach meets the constitution requirements?

**Decision**: Vitest for unit, Playwright for E2E

**Rationale**:
- Vitest: Fast, Vite-native, excellent TypeScript support
- Playwright: Cross-browser, mobile viewport testing, reliable selectors
- Constitution requires core unit tests and E2E coverage

**Test Structure**:
```
packages/core/tests/unit/
apps/web/tests/e2e/
workers/api/tests/integration/
```

### 7. Provider Response Normalization

**Question**: How should OSRM responses be normalized?

**Decision**: Define stable internal schema, normalize at Worker boundary

**Rationale**:
- Allows future provider swaps without UI changes
- Handles OSRM-specific quirks (coordinates in [lng, lat] order)
- Validates response before caching

**Internal Route Schema**:
```typescript
interface Route {
  distanceKm: number
  durationMin: number
  geometry: LineString // GeoJSON format
}
```

### 8. Caching Strategy

**Question**: How should routes be cached?

**Decision**: KV cache with composite key: `${originHash}-${destinationHash}`

**Rationale**:
- 7-day TTL aligns with spec requirements
- Composite key allows efficient lookup
- Hash coordinates to fixed-length keys (privacy + key size)
- Cache only successful responses

**Key Format**: `route:{hash}:{hash}`
- Hash: First 8 chars of SHA-256 of `lat,lng` rounded to 4 decimals (~11m precision)

## Open Questions Deferred

| Question | Deferral Reason |
|----------|-----------------|
| Production OSRM hosting | Not needed for MVP, evaluate at Phase 2 |
| Real charger database | Out of scope for Phase 1 |
| User authentication | Constitution says no PII; spec says user accounts - needs clarification |
| Telemetry/analytics | Not required for MVP |

## Technical Risks Identified

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OSRM demo rate limiting | Medium | High | Implement client-side retry with exponential backoff |
| Coordinate precision loss | Low | Medium | Use 4 decimal places (~11m) for cache keys, full precision for calculations |
| KV cold start latency | Medium | Low | Acceptable for MVP, monitor real-world performance |
| Leaflet mobile performance | Low | Medium | Test on low-end devices, consider simplifying geometry |

## References

- OSRM API Docs: https://project-osrm.org/docs/v5.24.0/api/
- Leaflet Docs: https://leafletjs.com/reference.html
- Cloudflare Workers KV: https://developers.cloudflare.com/kv/
- Vue 3 Composition API: https://vuejs.org/guide/extras/composition-api-faq.html
