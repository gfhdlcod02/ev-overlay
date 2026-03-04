# Tasks: Geolocation Map Defaults

**Input**: Design documents from `/specs/003-geolocation-map-defaults/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Tests**: E2E tests required per constitution principle IX (Playwright Web Testing)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

**Note**: This feature uses native browser APIs (Geolocation API, sessionStorage). No additional dependencies required.

- [x] T001 [P] Create TypeScript type definitions in `apps/web/src/types/location.ts` (GeolocationStatus, PermissionState, UserLocation interfaces)
- [x] T002 [P] Create coordinate validation utilities in `apps/web/src/utils/coordinates.ts` (lat/lng bounds checking)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create Pinia location store in `apps/web/src/stores/location.ts` with state, getters, and actions per contract
- [x] T004 Create useGeolocation composable in `apps/web/src/composables/useGeolocation.ts` per contract
- [x] T005 Add sessionStorage persistence to location store (hydrateFromStorage, saveToStorage)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Default Map View on Load (Priority: P1) 🎯 MVP

**Goal**: Map displays Thailand as default view immediately on page load, before geolocation is available

**Independent Test**: Open route page without granting location permissions - map should show Thailand centered at `[13.7563, 100.5018]` with zoom 6

### Tests for User Story 1

- [x] T006 [P] [US1] E2E test: Verify Thailand default view on load in `apps/web/e2e/geolocation.spec.ts`

### Implementation for User Story 1

- [x] T007 [US1] Add Thailand default constants and map initialization logic in `apps/web/src/components/map/MapView.vue`
- [x] T008 [US1] Ensure map renders immediately with Thailand view before geolocation request starts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Origin Set to Current Location (Priority: P1)

**Goal**: Origin field auto-populates with "Current Location" when permission granted and accuracy sufficient (<1km)

**Independent Test**: Grant location permission, reload page - Origin field should show "Current Location" label within 5 seconds

### Tests for User Story 2

- [x] T009 [P] [US2] E2E test: Verify origin auto-populates when permission granted in `apps/web/e2e/geolocation.spec.ts`
- [x] T010 [P] [US2] E2E test: Verify origin stays empty when permission denied in `apps/web/e2e/geolocation.spec.ts`

### Implementation for User Story 2

- [x] T011 [US2] Integrate geolocation request on mount in `apps/web/src/views/RoutePlanner.vue`
- [x] T012 [US2] Add Origin field binding to locationStore.locationLabel in `apps/web/src/views/RoutePlanner.vue`
- [x] T013 [US2] Add loading placeholder ("Locating...") when status is loading
- [x] T014 [US2] Implement accuracy threshold check (1km) before auto-populating

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Automatic Map Recentering (Priority: P2)

**Goal**: Map smoothly pans to user's location when geolocation available, unless user has manually interacted

**Independent Test**: Grant permission, wait for location - map should flyTo user's location with 1.5s animation

### Tests for User Story 3

- [x] T015 [P] [US3] E2E test: Verify map recenters to user location in `apps/web/e2e/geolocation.spec.ts`
- [x] T016 [P] [US3] E2E test: Verify map does NOT recenter after manual pan in `apps/web/e2e/geolocation.spec.ts`

### Implementation for User Story 3

- [x] T017 [US3] Add canAutoCenter getter logic to location store (respects hasUserInteracted flag)
- [x] T018 [US3] Watch canAutoCenter in `apps/web/src/components/map/MapView.vue` and trigger flyTo
- [x] T019 [US3] Add map event listeners (movestart, zoomstart) to mark user interaction
- [x] T020 [US3] Implement flyTo animation with 1.5s duration and zoom 13

**Checkpoint**: User Stories 1-3 should now be independently functional

---

## Phase 6: User Story 4 - Geolocation Fallback Handling (Priority: P2)

**Goal**: Graceful fallback to Thailand when permission denied, geolocation unavailable, or timeout

**Independent Test**: Deny location permission - app should remain functional with Thailand view and manual origin entry

### Tests for User Story 4

- [x] T021 [P] [US4] E2E test: Verify fallback to Thailand when permission denied in `apps/web/e2e/geolocation.spec.ts`
- [x] T022 [P] [US4] E2E test: Verify fallback after 5s timeout in `apps/web/e2e/geolocation.spec.ts`

### Implementation for User Story 4

- [x] T023 [US4] Implement 5s timeout handling in useGeolocation composable
- [x] T024 [US4] Handle PERMISSION_DENIED error code with graceful fallback
- [x] T025 [US4] Handle POSITION_UNAVAILABLE for unsupported browsers
- [x] T026 [US4] Ensure manual origin entry remains functional in all fallback scenarios

**Checkpoint**: User Stories 1-4 should now handle all permission scenarios

---

## Phase 7: User Story 5 - Loading State and Error Feedback (Priority: P2)

**Goal**: Clear visual feedback during geolocation request and user-friendly error messages

**Independent Test**: Observe loading spinner in Origin field during geolocation request, error notice on denial

### Tests for User Story 5

- [x] T027 [P] [US5] E2E test: Verify loading indicator visible during request in `apps/web/e2e/geolocation.spec.ts`
- [x] T028 [P] [US5] E2E test: Verify error notice on permission denial in `apps/web/e2e/geolocation.spec.ts`

### Implementation for User Story 5

- [x] T029 [US5] Add loading spinner to Origin field in `apps/web/src/views/RoutePlanner.vue`
- [x] T030 [US5] Create error notice component for permission denial in `apps/web/src/components/LocationErrorNotice.vue`
- [x] T031 [US5] Implement auto-dismiss for error notices (5 seconds)
- [x] T032 [US5] Clear loading state immediately on success, error, or timeout

**Checkpoint**: All user stories should now be independently functional with complete UX

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T033 [P] Run E2E test suite and fix any failures in `apps/web/e2e/geolocation.spec.ts`
- [x] T034 [P] Add unit tests for coordinate validation utilities in `apps/web/src/utils/coordinates.test.ts`
- [x] T035 [P] Add unit tests for location store in `apps/web/src/stores/location.test.ts`
- [x] T036 Update CLAUDE.md with implementation notes (manual section)
- [x] T037 Run linting and type checking across all modified files
- [x] T038 Validate quickstart.md steps still work after implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001, T002) - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story                      | Priority | Depends On         | Notes                                       |
| -------------------------- | -------- | ------------------ | ------------------------------------------- |
| US1 - Default Map View     | P1       | Foundational       | No other dependencies; sets base map state  |
| US2 - Origin Auto-populate | P1       | Foundational + US1 | Uses map component from US1                 |
| US3 - Auto-recenter        | P2       | Foundational + US1 | Extends map from US1; respects US2 location |
| US4 - Fallback             | P2       | Foundational + US1 | Error handling for US1-3 scenarios          |
| US5 - Loading States       | P2       | Foundational + US2 | UI feedback for US2 geolocation flow        |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Store/composable changes before UI changes
- Core logic before error handling
- Story complete before moving to next priority

### Parallel Opportunities

**Maximum Parallelization (5 developers)**:

1. **Dev A**: T001, T002 (Setup)
2. **Dev B**: T003, T004, T005 (Foundational) - starts after T001,T002
3. **Dev C**: T006-T008 (US1) - starts after T003-T005
4. **Dev D**: T009-T014 (US2) - starts after T003-T005
5. **Dev E**: T015-T032 (US3-US5) - starts after T003-T005 and US1 complete

**Or sequential by priority**:

1. Complete T001-T008 (US1) → MVP Demo: Thailand default view
2. Complete T009-T014 (US2) → MVP Demo: Auto-populate origin
3. Complete T015-T032 (US3-US5) → Full feature complete

---

## Parallel Examples

### Parallel Group 1: Setup

```bash
Task: "Create TypeScript type definitions in apps/web/src/types/location.ts"
Task: "Create coordinate validation utilities in apps/web/src/utils/coordinates.ts"
```

### Parallel Group 2: Foundational

```bash
Task: "Create Pinia location store in apps/web/src/stores/location.ts"
Task: "Create useGeolocation composable in apps/web/src/composables/useGeolocation.ts"
Task: "Add sessionStorage persistence to location store"
```

### Parallel Group 3: User Story 1 Tests + Implementation

```bash
# Tests first (will fail):
Task: "E2E test: Verify Thailand default view on load"

# Then implementation:
Task: "Add Thailand default constants in MapView.vue"
Task: "Ensure immediate Thailand view before geolocation"
```

### Parallel Group 4: All User Stories (after Foundational)

```bash
# Can all start once T003-T005 complete:
Task: "User Story 1: Default Map View"
Task: "User Story 2: Origin Auto-populate"
Task: "User Story 3: Auto-recenter"
Task: "User Story 4: Fallback Handling"
Task: "User Story 5: Loading States"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T008)
4. Complete Phase 4: User Story 2 (T009-T014)
5. **STOP and VALIDATE**: Test US1 + US2 together
   - Map shows Thailand on load ✓
   - Origin auto-populates when permission granted ✓
   - Graceful fallback when denied ✓
6. Deploy/demo MVP

### Incremental Delivery

1. **MVP** (US1-US2): Thailand default + Origin auto-populate
2. **Polish** (US3): Map auto-recentering
3. **Resilience** (US4-US5): Fallback handling + loading UX
4. Each increment adds value without breaking previous functionality

### Suggested MVP Scope

**Minimum viable for demo**: Complete through T014 (end of US2)

This delivers:

- Thailand default view on load
- Origin field auto-population with geolocation
- Graceful fallback when permission denied

User can plan routes immediately, with or without location permission.

---

## Task Summary

| Phase        | Tasks  | Story | Deliverable           |
| ------------ | ------ | ----- | --------------------- |
| Setup        | 2      | -     | Types and utilities   |
| Foundational | 3      | -     | Store and composable  |
| US1          | 3      | P1    | Thailand default view |
| US2          | 6      | P1    | Origin auto-populate  |
| US3          | 6      | P2    | Map auto-recenter     |
| US4          | 6      | P2    | Fallback handling     |
| US5          | 6      | P2    | Loading/error UX      |
| Polish       | 6      | -     | Tests and validation  |
| **Total**    | **38** |       |                       |

---

## Notes

- All tasks use absolute paths from repo root: `apps/web/src/...`
- E2E tests required per Constitution Principle IX (Playwright Web Testing)
- Constitution Principle IV (Security): Location data never leaves client
- Constitution Principle VI (Reliability): 5s timeout + fallback enforced
- No backend changes required - pure client-side feature
