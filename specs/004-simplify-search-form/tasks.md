# Tasks: Simplify Search Form

**Input**: Design documents from `/specs/004-simplify-search-form/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Tests are included per spec requirements (SC-001 through SC-006).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**[WARNING] CRITICAL**: No user story work can begin until this phase is complete

### Types and Interfaces

- [x] T001 [P] Add `CacheEntry<T>` interface to `apps/web/src/types/index.ts`
- [x] T002 [P] Add `PendingRequest<T>` interface to `apps/web/src/types/index.ts`
- [x] T003 [P] Add `CacheConfig` interface to `apps/web/src/types/index.ts`

### Core Services

- [x] T004 Implement `SearchCache` class in `apps/web/src/services/request-cache.ts` with LRU eviction and TTL
- [x] T005 Create unit tests for `SearchCache` in `apps/web/src/services/request-cache.test.ts`
- [x] T006 Implement cache key normalization function in `apps/web/src/services/api-client.ts`
- [x] T007 Implement `RequestDeduplicator` class in `apps/web/src/services/api-client.ts`
- [x] T008 Integrate `SearchCache` and `RequestDeduplicator` into `fetchRoute()` in `apps/web/src/services/api-client.ts`
- [x] T009 Add request cancellation via `AbortController` in `apps/web/src/services/api-client.ts`

**Checkpoint**: Foundation ready - SearchCache and RequestDeduplicator are tested and working

---

## Phase 2: User Stories 1 & 2 - Plain Text Inputs & API Efficiency (Priority: P1) 🎯 MVP

**Goal**: Convert Origin/Destination to plain text inputs (no autocomplete) and implement request deduplication, caching, and cancellation

**Independent Test**: Type in Origin/Destination - no autocomplete appears, no API calls during typing. Click "Plan Trip" - only one API call made, subsequent identical searches return cached results.

### Tests for User Stories 1 & 2

- [x] T010 [P] [US1] Create E2E test for no-autocomplete behavior in `apps/web/tests/e2e/trip-planning.spec.ts`
- [x] T011 [P] [US2] Create unit tests for request deduplication in `apps/web/src/services/api-client.test.ts`
- [x] T012 [P] [US2] Create unit tests for cache hit/miss behavior in `apps/web/src/services/api-client.test.ts`
- [x] T013 [P] [US2] Create E2E test for rapid click deduplication in `apps/web/tests/e2e/trip-planning.spec.ts`

### Implementation for User Stories 1 & 2

- [x] T014 [US1] Verify `TripInputForm.vue` has no autocomplete attributes on Origin/Destination inputs
- [x] T015 [US1] Add `autocomplete="off"` and `autocorrect="off"` to Origin input in `apps/web/src/components/TripInputForm.vue`
- [x] T016 [US1] Add `autocomplete="off"` and `autocorrect="off"` to Destination input in `apps/web/src/components/TripInputForm.vue`
- [x] T017 [US2] Ensure `useRoutePlanning.ts` uses cached `fetchRoute()` from api-client
- [x] T018 [US2] Add loading state handling to prevent rapid clicks in `apps/web/src/composables/useRoutePlanning.ts`
- [x] T019 [US2] Handle `AbortError` gracefully (don't show user error for cancellation) in `apps/web/src/services/api-client.ts`

**Checkpoint**: At this point, User Stories 1 & 2 should be fully functional and testable independently

---

## Phase 3: User Story 3 - Preserved Validation and UX (Priority: P2)

**Goal**: Ensure existing validation, geolocation auto-populate, and error handling remain unchanged

**Independent Test**: Verify all existing validation rules work, geolocation still auto-populates Origin when permission granted, API errors display inline.

### Tests for User Story 3

- [x] T020 [P] [US3] Verify existing validation tests still pass in `apps/web/tests/e2e/trip-planning.spec.ts`
- [x] T021 [P] [US3] Create E2E test for geolocation auto-populate preservation in `apps/web/tests/e2e/geolocation.spec.ts`
- [x] T022 [P] [US3] Create E2E test for API error display in `apps/web/tests/e2e/api-error-handling.spec.ts`

### Implementation for User Story 3

- [x] T023 [US3] Verify `useTripInput.ts` validation logic unchanged (no modifications needed)
- [x] T024 [US3] Verify `useGeolocation.ts` auto-populate behavior unchanged (no modifications needed)
- [x] T025 [US3] Ensure API errors are properly propagated to form error display in `apps/web/src/composables/useRoutePlanning.ts`
- [x] T026 [US3] Test edge case: empty/whitespace inputs handled by existing validation
- [x] T027 [US3] Test edge case: invalid coordinate format handled by existing validation

**Checkpoint**: All user stories should now be independently functional

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T028 [P] Run full test suite (`pnpm test` and `pnpm test:e2e`)
- [x] T029 [P] Run linting and formatting (`pnpm lint` and `pnpm format`)
- [x] T030 Verify quickstart.md manual testing checklist passes
- [x] T031 Update CLAUDE.md with feature completion notes
- [x] T032 Code review: verify no secrets in client bundle
- [x] T033 Performance check: verify cache memory usage <5MB for 50 entries

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately
- **User Stories 1 & 2 (Phase 2)**: Depends on Foundational phase (T001-T009)
- **User Story 3 (Phase 3)**: Depends on Foundational phase (T001-T009), can run in parallel with Phase 2
- **Polish (Phase 4)**: Depends on all user stories being complete

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Can start after Foundational (Phase 1)
- **User Story 3 (P2)**: Can start after Foundational (Phase 1) - validates existing behavior, minimal dependencies on US1/US2

### Within Each Phase

- Phase 1: T001-T003 (types) can run in parallel; T004-T005 (cache) then T006-T009 (api-client integration)
- Phase 2: Tests (T010-T013) can be written in parallel; implementation (T014-T019) follows
- Phase 3: Tests (T020-T022) and validation (T023-T027) mostly verification, can run in parallel with Phase 2

### Parallel Opportunities

```bash
# Phase 1 - Types can all be added together:
Task: "Add CacheEntry<T> interface"
Task: "Add PendingRequest<T> interface"
Task: "Add CacheConfig interface"

# Phase 2 - UI changes can happen in parallel with service integration:
Task: "Add autocomplete=off to inputs"
Task: "Integrate SearchCache into fetchRoute"

# Phase 3 - Validation verification can run in parallel:
Task: "Verify validation logic unchanged"
Task: "Verify geolocation behavior unchanged"
Task: "Test API error display"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Foundational (T001-T009) - Cache and dedup infrastructure
2. Complete Phase 2: User Stories 1 & 2 (T010-T019) - Core functionality
3. **STOP and VALIDATE**: Test MVP features
   - Plain text inputs work (no autocomplete)
   - API calls are deduplicated
   - Cache returns results without network request
   - Cancellation works
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → Infrastructure ready
2. Add User Stories 1 & 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Validation that existing UX preserved → Deploy/Demo
4. Polish → Final validation → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together (Phase 1)
2. Once Foundational is done:
   - Developer A: Phase 2 - User Stories 1 & 2 (main implementation)
   - Developer B: Phase 3 - User Story 3 (validation and testing)
3. Stories complete and integrate independently

---

## Success Criteria Validation

| Success Criteria                     | Validation Task  |
| ------------------------------------ | ---------------- |
| SC-001: No UI interruptions          | T010, T014-T016  |
| SC-002: Zero API calls during typing | T010             |
| SC-003: Deduplication works          | T011, T013, T018 |
| SC-004: Cache returns results        | T012             |
| SC-005: Validation preserved         | T020, T023-T027  |
| SC-006: Geolocation preserved        | T021, T024       |

---

## Task Summary

| Phase                    | Tasks     | Description                                                     |
| ------------------------ | --------- | --------------------------------------------------------------- |
| Phase 1 (Foundational)   | T001-T009 | Types, SearchCache, RequestDeduplicator, api-client integration |
| Phase 2 (US1 & US2 - P1) | T010-T019 | Tests, plain text inputs, API efficiency features               |
| Phase 3 (US3 - P2)       | T020-T027 | Validation tests, preserved UX verification                     |
| Phase 4 (Polish)         | T028-T033 | Full test suite, linting, performance check                     |

**Total Tasks**: 33
**MVP Tasks (Phase 1 + 2)**: 19
**Estimated Parallel Groups**: 4-5 (types, cache tests, UI changes, validation checks)
