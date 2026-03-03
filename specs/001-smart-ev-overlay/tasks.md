# Tasks: Smart EV Overlay for Google Maps

**Feature**: 001-smart-ev-overlay
**Branch**: `001-smart-ev-overlay`
**Date**: 2026-03-01

## Summary

This task list implements a Cloudflare-first web application for EV trip planning with route visualization, safe range calculations, virtual charging stops, and Google Maps handoff.

**Total Tasks**: 66
**Completed**: 66
**Status**: ✅ ALL TASKS COMPLETE - DEPLOYED
**User Stories**: 4 (2 P1, 1 P2, 1 P3)
**Live Demo**: [https://fc6ea9ab.ev-overlay.pages.dev](https://fc6ea9ab.ev-overlay.pages.dev)
**API Endpoint**: [https://ev-overlay-api.gfhdlcod02.workers.dev/api/route](https://ev-overlay-api.gfhdlcod02.workers.dev/api/route)
**Estimated Parallel Groups**: 6

---

## Dependency Graph

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational (packages/core types, validation)
    │
    ├───▶ Phase 3: US2 - Safe Range Calculation (P1)
    │         │
    │         ▼
    ├───▶ Phase 4: US1 - Route Visualization (P1)
    │         │ (depends on core calculations)
    │         ▼
    ├───▶ Phase 5: US3 - Google Maps Handoff (P2)
    │         │ (depends on stops from US1/US2)
    │         ▼
    └───▶ Phase 6: US4 - Route Caching (P3)
              │ (optimization layer)
              ▼
         Phase 7: Polish & E2E Tests
```

---

## Phase 1: Setup

**Goal**: Initialize monorepo structure with pnpm workspaces, TypeScript configuration, and build tooling.

**Independent Test**: `pnpm install` completes successfully and `pnpm build` produces no errors on stub packages.

- [X] T001 Create root `package.json` with pnpm workspace configuration
- [X] T002 Create `pnpm-workspace.yaml` defining packages/*, apps/*, workers/*
- [X] T003 Create root `tsconfig.json` with shared TypeScript configuration
- [X] T004 Create root `.gitignore` for Node.js, pnpm, and build artifacts
- [X] T005 Create `packages/core/package.json` with TypeScript build scripts
- [X] T006 Create `packages/core/tsconfig.json` extending root config
- [X] T007 Create `apps/web/package.json` with Vue 3, Vite, Leaflet, Tailwind dependencies
- [X] T008 Create `apps/web/tsconfig.json` with Vue type support
- [X] T009 Create `apps/web/vite.config.ts` with Vue plugin and path aliases
- [X] T010 Create `workers/api/package.json` with Wrangler and Cloudflare Workers types
- [X] T011 Create `workers/api/tsconfig.json` with Workers runtime types
- [X] T012 Create `workers/api/wrangler.toml` with KV namespace binding
- [X] T013 Create shared ESLint and Prettier configuration files
- [X] T014 Create root `README.md` with quickstart instructions
- [X] T015a Configure root `package.json` with security audit scripts and `.gitignore` for secrets

---

## Phase 2: Foundational

**Goal**: Implement shared types, domain models, and validation logic in `packages/core`.

**Independent Test**: All unit tests in `packages/core/tests/unit/` pass with 100% coverage on types and validation.

- [X] T015 [P] Create `packages/core/src/types/index.ts` with shared type definitions (Location, LineString, DrivingFactor)
- [X] T016 [P] Create `packages/core/src/types/ev-parameters.ts` with EVParameters interface and validation bounds
- [X] T017 [P] Create `packages/core/src/types/route.ts` with Route, SafeRange, ChargingStop, RouteSegment interfaces
- [X] T018 Create `packages/core/src/validators/index.ts` with input validation functions (coordinate bounds, numeric ranges)
- [X] T019 Create `packages/core/src/validators/ev-validation.ts` with validateEVParameters() function (FR-001a)
- [X] T020 Create `packages/core/tests/unit/validators.test.ts` with validation test cases
- [X] T021 Create `packages/core/src/utils/haversine.ts` with distance calculation between coordinates
- [X] T022 Create `packages/core/tests/unit/haversine.test.ts` for distance calculation tests

---

## Phase 3: US2 - Calculate Safe Driving Range (P1)

**Goal**: Implement deterministic safe range calculation and stop placement algorithms in `packages/core`.

**Independent Test**: Unit tests verify correct safe range calculations for all driving factors and edge cases (insufficient charge, max stops exceeded).

**Acceptance Scenarios**:
- Given 70% charge, 20% reserve, 450km range, Normal factor → ~196km safe range
- Given charge ≤ reserve → error: insufficient charge
- Given different driving modes → correct consumption factors applied

- [X] T023 Create `packages/core/src/calculator/safe-range.ts` with calculateSafeRange() function (FR-002 formula)
- [X] T024 Create `packages/core/tests/unit/safe-range.test.ts` with deterministic calculation tests (SC-002)
- [X] T025 Create `packages/core/src/calculator/stop-placement.ts` with calculateChargingStops() function (FR-005)
- [X] T026 Create `packages/core/tests/unit/stop-placement.test.ts` with stop placement tests (SC-003)
- [X] T027 Create `packages/core/src/calculator/segment-builder.ts` with buildRouteSegments() for safe/risky classification (FR-006)
- [X] T028 Create `packages/core/tests/unit/segment-builder.test.ts` for segment classification tests
- [X] T029 Create `packages/core/src/calculator/distance-accumulator.ts` with accumulateDistance() for geometry parsing
- [X] T030 Create `packages/core/tests/unit/distance-accumulator.test.ts` for distance accumulation tests
- [X] T031 Create `packages/core/src/index.ts` exporting all calculator functions
- [X] T032 Run `pnpm --filter @ev/core test:coverage` and verify 100% unit test coverage (SC-007)

---

## Phase 4: US1 - Plan EV Trip with Route Visualization (P1)

**Goal**: Build Vue 3 frontend with trip input form, map visualization, and charging stop markers.

**Independent Test**: User can enter SF to LA trip, see route with green/red segments, and click stop markers for tooltips.

**Acceptance Scenarios**:
- Enter origin, destination, EV params → route displays with distance, duration, colored segments
- Safe range < trip distance → charging stops appear as markers
- Click stop marker → tooltip with stop information

- [X] T033 Create `apps/web/src/types/index.ts` with frontend-specific types (TripInput, MapState)
- [X] T034 Create `apps/web/src/composables/useTripInput.ts` for reactive trip input state management
- [X] T035 Create `apps/web/src/components/TripInputForm.vue` with origin, destination, SoC, range, reserve, factor inputs (FR-001)
- [X] T036 Create `apps/web/src/components/EVParameterInputs.vue` for numeric input fields with validation feedback (FR-001a)
- [X] T037 Create `apps/web/src/services/api-client.ts` with fetch wrapper for `/api/route` endpoint
- [X] T038 Create `apps/web/src/composables/useRoutePlanning.ts` for route fetching and state management
- [X] T039 Create `apps/web/src/components/RouteMap.vue` with Leaflet map initialization and route polyline display
- [X] T040 Create `apps/web/src/components/RouteSegments.vue` for safe (green) and risky (red) segment rendering (FR-006)
- [X] T041 Create `apps/web/src/components/ChargingStopMarker.vue` with tooltip showing stop information (FR-007)
- [X] T042 Create `apps/web/src/components/ChargingStopList.vue` for sidebar list of suggested stops
- [X] T043 Create `apps/web/src/App.vue` with left panel (inputs/summary) and right panel (map) layout
- [X] T044 Create `apps/web/src/main.ts` with Vue app initialization and global styles
- [X] T045 Add Tailwind CSS configuration with WCAG 2.1 AA color contrast compliance (FR-011)
- [X] T046 Create `apps/web/index.html` with responsive viewport meta tags (FR-010)

---

## Phase 5: US3 - Navigate with Charging Stops in Google Maps (P2)

**Goal**: Implement Google Maps URL builder and handoff button.

**Independent Test**: Clicking "Open in Google Maps" opens correct URL with waypoints in order.

**Acceptance Scenarios**:
- Route with 2 charging stops → Google Maps opens with origin, destination, and 2 waypoints
- Route with no stops → Google Maps opens with just origin and destination
- Mobile device → opens Google Maps app or web version

- [X] T047 Create `packages/core/src/url-builder/google-maps.ts` with buildGoogleMapsUrl() function (FR-008)
- [X] T048 Create `packages/core/tests/unit/google-maps.test.ts` with URL generation tests (SC-004)
- [X] T049 Create `apps/web/src/components/GoogleMapsButton.vue` with handoff button and mobile detection
- [X] T050 Create `apps/web/src/composables/useGoogleMapsHandoff.ts` for URL generation and window opening logic

---

## Phase 6: US4 - Cache Route Data for Performance (P3)

**Goal**: Implement Cloudflare Worker with OSRM proxy and KV caching.

**Independent Test**: Second identical route request returns in <200ms (cached) vs >2s (uncached).

**Acceptance Scenarios**:
- First request → fetches from OSRM and caches
- Same request within 7 days → returns cached data

- [X] T051 Create `workers/api/src/providers/osrm-client.ts` with OSRM API client and timeout handling
- [X] T052 Create `workers/api/src/providers/normalize.ts` with OSRM response normalization to internal Route format
- [X] T053 Create `workers/api/src/cache/kv-cache.ts` with KV read/write functions and 7-day TTL (FR-009)
- [X] T054 Create `workers/api/src/handlers/route.ts` with `/api/route` endpoint implementation (FR-004, FR-004a)
- [X] T055 Create `workers/api/src/handlers/cors.ts` with CORS preflight handling (contract spec)
- [X] T056 Create `workers/api/src/index.ts` with Worker entry point and request routing
- [X] T057 Create `workers/api/tests/integration/route.test.ts` with KV cache hit/miss tests (SC-005)
- [X] T058 Run `pnpm --filter @ev/api test` and verify integration tests pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Add E2E tests, error handling UI, responsive design, and accessibility improvements.

**Independent Test**: Playwright E2E tests pass for complete user flow.

- [X] T059 Create `apps/web/tests/e2e/trip-planning.spec.ts` with Playwright test: input → visualize → Google Maps handoff
- [X] T060 Create `apps/web/src/components/ErrorDisplay.vue` for network, validation, and routing error states (FR-004a, SC-006)
- [X] T061 Create `apps/web/src/components/LoadingState.vue` for route fetching and calculation loading indicators
- [X] T062 Add ARIA labels and keyboard navigation to all interactive elements (FR-011)
- [X] T063 Verify responsive design on mobile viewport (375px width) (FR-010)
- [X] T064 Create `apps/web/tests/e2e/mobile.spec.ts` with mobile viewport Playwright tests
- [X] T065 Run `pnpm --filter @ev/web test:e2e` and verify all E2E tests pass (Constitution IX)
- [X] T066 Run security audit: `pnpm audit --audit-level=high` passes with no unaddressed vulnerabilities

---

## Parallel Execution Examples

### Parallel Group 1: Core Types (T015-T017)
```bash
# All type definitions are independent
T015: Create types/index.ts
T016: Create types/ev-parameters.ts
T017: Create types/route.ts
```

### Parallel Group 2: Calculator Functions (T023-T030 after T015-T022)
```bash
# After foundational types and validation:
T023: safe-range.ts          T027: segment-builder.ts
T024: safe-range.test.ts     T028: segment-builder.test.ts
T025: stop-placement.ts      T029: distance-accumulator.ts
T026: stop-placement.test.ts T030: distance-accumulator.test.ts
```

### Parallel Group 3: Frontend Components (T033-T046 after T031-T032)
```bash
# After core package is built:
T035: TripInputForm.vue      T041: ChargingStopMarker.vue
T036: EVParameterInputs.vue  T042: ChargingStopList.vue
T039: RouteMap.vue           T043: App.vue
T040: RouteSegments.vue      T045: Tailwind config
```

### Parallel Group 4: Worker Components (T051-T054 after T012)
```bash
# After Worker setup:
T051: osrm-client.ts    T053: kv-cache.ts
T052: normalize.ts      T054: route handler
```

---

## Implementation Strategy

### MVP-First Approach

**Phase 1-3 (Core Logic)**: Complete first as all other features depend on deterministic calculations.

**Phase 4 (UI - US1)**: Build basic visualization that works. Polish comes later.

**Phase 5 (Handoff - US3)**: Simple URL generation, high user value.

**Phase 6 (Caching - US4)**: Optimization layer, can be deferred if needed.

### Definition of Done per Task

- Code follows project style (ESLint/Prettier)
- TypeScript compiles without errors
- Unit tests pass (for core logic)
- No secrets in client bundle (Constitution IV)

### Quality Gates

1. **After Phase 3**: Core unit tests achieve 100% coverage (SC-007)
2. **After Phase 4**: Manual testing confirms route visualization works end-to-end
3. **After Phase 7**: E2E tests pass, including mobile viewport (Constitution IX)

---

## Success Criteria Mapping

| Success Criterion | Validating Tasks |
|-------------------|------------------|
| SC-001: <30s trip to visualization | T039, T043, T053, T054 |
| SC-002: Deterministic calculations | T024 (unit tests) |
| SC-003: Correct stop placement | T026 (unit tests) |
| SC-004: Google Maps handoff | T048 (unit tests), T049 |
| SC-005: 80% cache improvement | T057 (integration tests) |
| SC-006: Clear error messages | T060, T054 |
| SC-007: Core logic unit tested | T020, T022, T024, T026, T028, T030, T048, T032 |

---

## File Path Summary

**packages/core/**:
- `src/types/index.ts`, `ev-parameters.ts`, `route.ts`
- `src/validators/index.ts`, `ev-validation.ts`
- `src/utils/haversine.ts`
- `src/calculator/safe-range.ts`, `stop-placement.ts`, `segment-builder.ts`, `distance-accumulator.ts`
- `src/url-builder/google-maps.ts`
- `src/index.ts`
- `tests/unit/*.test.ts`

**apps/web/**:
- `src/types/index.ts`
- `src/composables/useTripInput.ts`, `useRoutePlanning.ts`, `useGoogleMapsHandoff.ts`
- `src/components/TripInputForm.vue`, `EVParameterInputs.vue`, `RouteMap.vue`, `RouteSegments.vue`, `ChargingStopMarker.vue`, `ChargingStopList.vue`, `GoogleMapsButton.vue`, `ErrorDisplay.vue`, `LoadingState.vue`
- `src/services/api-client.ts`
- `src/App.vue`, `main.ts`
- `tests/e2e/*.spec.ts`

**workers/api/**:
- `src/providers/osrm-client.ts`, `normalize.ts`
- `src/cache/kv-cache.ts`
- `src/handlers/route.ts`, `cors.ts`
- `src/index.ts`
- `tests/integration/*.test.ts`
