# Tasks: Refactor Project Structure for Best Practices

**Input**: Design documents from `/specs/005-refactor-structure/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: Tests are included per spec requirements (SC-001 through SC-006).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure path aliases and build tooling for all packages

- [x] T001 Configure TypeScript path aliases in `packages/core/tsconfig.json` with `@/` mapping
- [x] T002 Configure TypeScript path aliases in `apps/web/tsconfig.json` with `@/` and `@core` mappings
- [x] T003 Configure TypeScript path aliases in `workers/api/tsconfig.json` with `@/` mapping
- [x] T004 [P] Update Vite configuration in `apps/web/vite.config.ts` to resolve path aliases
- [x] T005 [P] Configure ESLint rules to enforce absolute imports over relative paths
- [x] T006 Verify path aliases work across all packages with test imports

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared configuration and conventions before package refactoring

**[WARNING] CRITICAL**: No package refactoring can begin until this phase is complete

- [x] T007 Create shared ESLint configuration at root level `.eslintrc.js` for consistent linting
- [x] T008 Create shared Prettier configuration at root level `.prettierrc` for consistent formatting
- [x] T009 [P] Document new folder structure conventions in `docs/project-structure.md`
- [x] T010 Create migration guide for developers in `docs/migration-guide.md`
- [x] T011 Verify all existing tests pass before starting refactor (baseline)

**Checkpoint**: Foundation ready - package refactoring can now begin in sequence

---

## Phase 3: User Story 1 - Clear Code Organization (Priority: P1) 🎯 MVP

**Goal**: Restructure packages/core with feature-based organization and co-located tests

**Independent Test**: Run `pnpm test` in packages/core - all 85 tests pass

### Implementation for User Story 1

- [x] T012 [P] Create `packages/core/src/calculator/` directory with index.ts
- [x] T013 [P] Create `packages/core/src/utils/` directory
- [x] T014 Move `packages/core/src/calculator/distance-accumulator.ts` and its test to calculator/
- [x] T015 Move `packages/core/src/calculator/segment-builder.ts` and its test to calculator/
- [x] T016 Move `packages/core/src/calculator/stop-placement.ts` and its test to calculator/
- [x] T017 Move `packages/core/src/calculator/index.ts` to calculator/ (update exports if needed)
- [x] T018 Move `packages/core/src/utils/haversine.ts` and its test to utils/
- [x] T019 Move `packages/core/src/utils/validators.ts` to utils/
- [x] T020 [US1] Update all imports in core to use `@/` path aliases instead of relative paths
- [x] T021 [US1] Update `packages/core/package.json` exports if needed
- [x] T022 [US1] Run core tests and verify all 85 tests pass
- [x] T023 [US1] Build core package and verify no errors

**Checkpoint**: At this point, packages/core should be fully refactored with new structure and all tests passing

---

## Phase 4: User Story 2 - Separation of Concerns (Priority: P1)

**Goal**: Restructure apps/web with feature-based organization, co-located tests, and clear layer separation

**Independent Test**: Run `pnpm test` in apps/web - all 71 tests pass

### Implementation for User Story 2

- [x] T024 [P] Create `apps/web/src/features/trip-planning/components/` directory
- [x] T025 [P] Create `apps/web/src/features/trip-planning/composables/` directory
- [x] T026 [P] Create `apps/web/src/features/map/components/` directory
- [x] T027 [P] Create `apps/web/src/features/map/composables/` directory
- [x] T028 [P] Create `apps/web/src/features/map/stores/` directory
- [x] T029 [P] Create `apps/web/src/features/ev-params/components/` directory
- [x] T030 Move `apps/web/src/components/TripInputForm.vue` to features/trip-planning/components/
- [x] T031 Move `apps/web/src/components/TripSummary.vue` to features/trip-planning/components/
- [x] T032 Move `apps/web/src/components/ChargingStopList.vue` to features/trip-planning/components/
- [x] T033 Move `apps/web/src/composables/useTripInput.ts` to features/trip-planning/composables/
- [x] T034 Move `apps/web/src/composables/useRoutePlanning.ts` to features/trip-planning/composables/
- [x] T035 Move `apps/web/src/components/RouteMap.vue` to features/map/components/
- [x] T036 Move `apps/web/src/composables/useGeolocation.ts` to features/map/composables/
- [x] T037 Move `apps/web/src/stores/location.ts` to features/map/stores/
- [x] T038 Move `apps/web/src/components/EVParameterInputs.vue` to features/ev-params/components/
- [x] T039 Move `apps/web/src/components/LoadingState.vue` to features/ev-params/components/
- [x] T040 Move `apps/web/src/services/api-client.ts` and its test to services/ (already there, verify structure)
- [x] T041 Move `apps/web/src/services/request-cache.ts` and its test to services/
- [x] T042 [US2] Update all imports in web to use `@/` path aliases
- [x] T043 [US2] Update cross-package imports to use `@core` alias
- [x] T044 [US2] Run web tests and verify all 71 tests pass
- [x] T045 [US2] Build web package and verify no errors

**Checkpoint**: At this point, apps/web should be fully refactored with new structure and all tests passing

---

## Phase 5: User Story 3 - Dependency Management (Priority: P2)

**Goal**: Restructure workers/api with feature-based organization and verify dependency graph

**Independent Test**: Run `pnpm test` in workers/api - all 22 tests pass; verify no circular dependencies

### Implementation for User Story 3

- [x] T046 [P] Create `workers/api/src/features/routing/handlers/` directory
- [x] T047 [P] Create `workers/api/src/features/routing/providers/` directory
- [x] T048 [P] Create `workers/api/src/features/routing/cache/` directory
- [x] T049 [P] Create `workers/api/src/features/rate-limiting/handlers/` directory
- [x] T050 Move `workers/api/src/handlers/route.ts` to features/routing/handlers/
- [x] T051 Move `workers/api/src/providers/osrm-client.ts` to features/routing/providers/
- [x] T052 Move `workers/api/src/cache/kv-cache.ts` to features/routing/cache/
- [x] T053 Move `workers/api/src/handlers/rate-limit.ts` to features/rate-limiting/handlers/
- [x] T054 [US3] Update all imports in api to use `@/` path aliases
- [x] T055 [US3] Run api tests and verify all 22 tests pass
- [x] T056 [US3] Build api package and verify no errors
- [x] T057 [US3] Run dependency analysis to verify no circular dependencies between packages

**Checkpoint**: At this point, workers/api should be fully refactored and dependency graph verified

---

## Phase 6: User Story 4 - Configuration Management (Priority: P2)

**Goal**: Centralize configuration and ensure 100% externalization of environment-specific values

**Independent Test**: Verify no hardcoded environment values in source code; all config in .env files or config files

### Implementation for User Story 4

- [x] T058 Audit all packages for hardcoded environment-specific values
- [x] T059 [P] Move any hardcoded URLs to environment variables in `apps/web/.env.example`
- [x] T060 [P] Move any hardcoded URLs to environment variables in `workers/api/.env.example`
- [x] T061 [US4] Create centralized configuration loader in `apps/web/src/config/index.ts`
- [x] T062 [US4] Create centralized configuration loader in `workers/api/src/config/index.ts`
- [x] T063 [US4] Update all code to use configuration loaders instead of hardcoded values
- [x] T064 [US4] Document all environment variables in `docs/environment-variables.md`
- [x] T065 [US4] Verify 100% of configuration is externalized (no hardcoded env values in source)

**Checkpoint**: At this point, all configuration should be centralized and externalized

---

## Phase 7: Verification & Cross-Cutting Concerns

**Purpose**: Final validation that all success criteria are met

- [x] T066 Run full test suite (all packages) and verify 178 tests pass
- [x] T067 Run E2E tests and verify 96 tests pass
- [x] T068 Run build for all packages and verify success
- [x] T069 Run lint checks across entire codebase
- [x] T070 Verify no `../../../` style relative imports remain in codebase (grep for patterns)
- [x] T071 Verify all packages have consistent folder structure
- [x] T072 [P] Update README.md with new project structure documentation
- [x] T073 Update CLAUDE.md with new folder conventions for future AI assistance
- [x] T074 Create architecture decision record (ADR) in `docs/adr/005-refactor-structure.md`
- [x] T075 Measure and document build time improvement (baseline vs after refactor)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all package refactoring
- **User Stories (Phase 3-6)**: Sequential by design
  - US1 (core) → US2 (web) → US3 (api) → US4 (config)
  - Each package builds on the previous (dependency order)
- **Verification (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - core)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1 - web)**: Depends on US1 complete (core provides types used by web)
- **User Story 3 (P2 - api)**: Can start after US2, but ideally after US1 (clean sequence)
- **User Story 4 (P2 - config)**: Can run parallel to US2/US3 once foundation is set

### Within Each User Story

- Directory creation tasks marked [P] can run in parallel
- File moves depend on directories existing
- Import updates depend on files being in new locations
- Tests must pass before story is complete

### Parallel Opportunities

- All directory creation tasks across all phases can be done together (but sequential by story is clearer)
- US4 (config) can overlap with US2 and US3 once foundation is set
- Phase 7 verification tasks marked [P] can run in parallel

---

## Implementation Strategy

### Sequential Package Refactor (Recommended)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (core)
   - Test independently
   - Verify all core tests pass
4. Complete Phase 4: User Story 2 (web)
   - Test independently
   - Verify all web tests pass
5. Complete Phase 5: User Story 3 (api)
   - Test independently
   - Verify all api tests pass
6. Complete Phase 6: User Story 4 (config)
   - Verify configuration externalization
7. Complete Phase 7: Final verification
   - Full test suite
   - Build verification
   - Documentation updates

### Incremental Validation

- Each package (core, web, api) is independently testable after its phase
- Stop after any package to validate in isolation
- No breaking changes to other packages during individual package refactor
- Final integration test at Phase 7

---

## Notes

- [P] tasks = different files, no dependencies
- Each user story represents one package refactor
- Test continuously - every package must pass tests after refactor
- No functional changes - only structural reorganization
- Keep commits small and focused per task
- Document any unexpected issues encountered during refactor
