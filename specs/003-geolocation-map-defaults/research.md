# Research: Geolocation Map Defaults

**Feature**: 003-geolocation-map-defaults
**Date**: 2026-03-03
**Researcher**: Claude Code (AI Assistant)

---

## Research Scope

This document captures technical decisions for implementing browser geolocation defaults in a Vue 3 + Leaflet web application.

---

## Decision 1: Geolocation API Strategy

**Decision**: Use the native browser Geolocation API (`navigator.geolocation.getCurrentPosition`) with a wrapper composable.

**Rationale**:

- Native API has broad browser support (95%+ coverage)
- No external dependencies required
- Sufficient accuracy for route planning use case
- Built-in permission handling

**Alternatives Considered**:

- **IP-based geolocation services** (rejected: insufficient accuracy, privacy concerns, adds external dependency)
- **Google Maps Geolocation API** (rejected: requires API key, adds cost, overkill for this feature)
- **Third-party libraries** (rejected: native API is simple enough, avoid bundle bloat)

---

## Decision 2: State Management Pattern

**Decision**: Use a Pinia store for geolocation state with sessionStorage persistence.

**Rationale**:

- Centralized state management aligns with existing Vue 3 patterns
- sessionStorage satisfies "current session only" requirement
- Easy to test and mock in unit tests
- Reactive integration with Vue components

**Implementation Pattern**:

```typescript
// stores/location.ts
interface LocationState {
  position: GeolocationPosition | null
  status: 'idle' | 'loading' | 'success' | 'error' | 'denied'
  error: GeolocationPositionError | null
  hasUserInteracted: boolean
}
```

---

## Decision 3: Map Recentering Strategy

**Decision**: Use Leaflet's `flyTo()` method with 1.5s duration for smooth animations.

**Rationale**:

- `flyTo()` provides a natural, zoom-out-then-in animation
- 1.5s duration balances visibility with responsiveness
- Respects user interaction flag to prevent disruption

**Alternatives Considered**:

- `panTo()` (rejected: no zoom adjustment, less visually clear)
- `setView()` with no animation (rejected: jarring jump)
- Custom animation (rejected: unnecessary complexity)

---

## Decision 4: Accuracy Threshold Handling

**Decision**: Accept positions with `accuracy <= 1000m`; reject less accurate with fallback to manual entry.

**Rationale**:

- 1km is sufficient for route planning origin selection
- IP-based geolocation typically has 10km+ accuracy (will be rejected)
- WiFi/cell-based positioning is usually <500m (will be accepted)

**Error Handling**:

- If accuracy > 1000m: treat as unavailable, show fallback
- User can still manually enter location

---

## Decision 5: Loading State UX Pattern

**Decision**: Show inline loading indicator in Origin field + subtle map overlay spinner.

**Rationale**:

- Non-blocking: user can interact with map while locating
- Clear feedback without modal/overlay interruption
- Matches existing UI patterns in the application

**States**:

1. Initial: "Locating..." in Origin field
2. Success: Replace with "Current Location"
3. Denied/Error: Show placeholder text + inline notice

---

## Decision 6: Thailand Default Viewport

**Decision**: Center at `[13.7563, 100.5018]` (Bangkok) with zoom level 6.

**Rationale**:

- Bangkok is the geographic and population center of Thailand
- Zoom 6 shows all of Thailand + some neighboring context
- Matches the specified fallback coordinates in requirements

**Viewport Calculation**:

```javascript
const THAILAND_DEFAULT = {
  center: [13.7563, 100.5018], // Bangkok
  zoom: 6,
}
```

---

## Decision 7: Permission Handling Flow

**Decision**: Request permission on page load with clear UX for each outcome.

**Flow**:

1. Page loads → Show Thailand default immediately
2. Request geolocation in background
3. Timeout after 5 seconds
4. Handle outcomes:
   - **Granted + accurate**: Update origin, recenter map (if no user interaction)
   - **Granted + inaccurate**: Show warning, keep Thailand default
   - **Denied**: Show inline notice, manual entry available
   - **Timeout**: Silent fallback to Thailand

**Rationale**: Best balance of user experience (auto-populate when possible) with graceful degradation.

---

## Decision 8: Session Storage Schema

**Decision**: Store minimal state in sessionStorage to preserve location across refresh.

**Schema**:

```typescript
interface StoredLocation {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  status: 'granted' | 'denied'
}
```

**Rationale**:

- Satisfies "current session only" requirement
- Avoids re-prompting on page refresh
- Timestamp allows freshness checks (optional)

---

## Technical Risks & Mitigations

| Risk                                 | Likelihood | Impact | Mitigation                                 |
| ------------------------------------ | ---------- | ------ | ------------------------------------------ |
| Browser blocks geolocation in iframe | Low        | Medium | Document requirement for top-level context |
| User on VPN with distant IP          | Medium     | Low    | Accuracy threshold filters these out       |
| Slow geolocation on mobile           | Medium     | Medium | 5s timeout prevents indefinite waiting     |
| Permission prompt fatigue            | Low        | High   | Only request once per session              |

---

## References

- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Leaflet flyTo documentation](https://leafletjs.com/reference.html#map-flyto)
- [Pinia State Management](https://pinia.vuejs.org/)
