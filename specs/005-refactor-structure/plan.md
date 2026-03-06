# Implementation Plan: Refactor Project Structure for Best Practices

**Branch**: `005-refactor-structure` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-refactor-structure/spec.md`

## Summary

Refactor the EV Overlay project codebase to follow consistent organizational patterns, clear separation of concerns, and best practices for maintainability. This is a structural improvement with no functional changes.

## Technical Context

**Language/Version**: TypeScript 5.3, Node 20+
**Primary Dependencies**: Vue 3.4, Vite 5, Cloudflare Workers
**Storage**: N/A (structural refactor only)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (Cloudflare Pages + Workers)
**Project Type**: Monorepo with 3 packages (core, web, api)
**Performance Goals**: Build time improvement 20%+
**Constraints**: Zero functional changes, all tests must pass
**Scale/Scope**: 3 packages, ~100 source files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cloudflare-First Infrastructure | [PASS] | No infrastructure changes |
| II. Conservative Safety-First UX | [PASS] | No UX changes |
| III. Deterministic Core Logic | [PASS] | No logic changes |
| IV. Security & Privacy by Design | [PASS] | No security changes |
| V. Separation of Concerns Architecture | [PASS] | This refactor enhances this principle |
| VI. Reliability & Performance | [PASS] | Build time improvement aligns with performance goals |
| VII. Definition of Done Quality Gate | [PASS] | All tests must pass |
| VIII. Phase-Gated Delivery | [PASS] | Incremental refactor per package |
| IX. Playwright Web Testing | [PASS] | E2E tests preserved |
| X. Code Quality Standards | [PASS] | Improves code organization |
| XI. Code Security Standards | [PASS] | No security impact |

**Gate Result**: [PASS] ALL CLEAR - Proceed to Phase 0

---

## Phase 0: Research & Decisions

### Research Topics

Based on clarifications from spec:

1. **Refactoring Strategy**: Incremental package-by-package (core → web → api)
2. **Test Organization**: Co-located tests (`.test.ts` next to source)
3. **Folder Structure**: Hybrid - feature-based top level, type-based sub-folders
4. **Import Aliases**: `@` prefix (`@core`, `@web`, `@api`, `@/`)
5. **Verification**: Continuous test validation after each package

### Decisions

| Decision | Rationale |
|----------|-----------|
| **Incremental approach** | Reduces risk, allows learning and adjustment between packages |
| **Co-located tests** | Simpler imports, obvious test coverage, easier navigation |
| **Hybrid folder structure** | Balances feature discoverability with type separation |
| **@ prefix aliases** | Industry standard, clear cross-package vs internal distinction |
| **core → web → api sequence** | Core has no dependencies, web depends on core, api is standalone |

---

## Phase 1: Design

### Project Structure

Target structure after refactor:

```text
# packages/core (pure TypeScript logic)
src/
├── calculator/          # EV estimation logic
│   ├── index.ts
│   ├── distance-accumulator.ts
│   ├── segment-builder.ts
│   ├── stop-placement.ts
│   ├── distance-accumulator.test.ts
│   ├── segment-builder.test.ts
│   └── stop-placement.test.ts
├── utils/               # Shared utilities
│   ├── haversine.ts
│   ├── haversine.test.ts
│   └── validators.ts
└── types/
    └── index.ts

# apps/web (Vue 3 SPA)
src/
├── features/            # Feature-based organization
│   ├── trip-planning/
│   │   ├── components/
│   │   │   ├── TripInputForm.vue
│   │   │   ├── TripSummary.vue
│   │   │   └── ChargingStopList.vue
│   │   ├── composables/
│   │   │   ├── useTripInput.ts
│   │   │   └── useRoutePlanning.ts
│   │   └── index.ts
│   ├── map/
│   │   ├── components/
│   │   │   └── RouteMap.vue
│   │   ├── composables/
│   │   │   └── useGeolocation.ts
│   │   └── stores/
│   │       └── location.ts
│   └── ev-params/
│       └── components/
│           ├── EVParameterInputs.vue
│           └── LoadingState.vue
├── services/            # Shared services
│   ├── api-client.ts
│   ├── api-client.test.ts
│   ├── request-cache.ts
│   └── request-cache.test.ts
├── utils/
│   └── coordinates.ts
└── types/
    └── index.ts

# workers/api (Cloudflare Worker)
src/
├── features/
│   ├── routing/
│   │   ├── handlers/route.ts
│   │   ├── providers/osrm-client.ts
│   │   ├── providers/normalize.ts
│   │   └── cache/kv-cache.ts
│   ├── rate-limiting/
│   │   └── handlers/rate-limit.ts
│   └── shared/
│       └── handlers/cors.ts
├── config/
│   └── index.ts
└── index.ts
```

### Key Configuration Changes

1. **TypeScript Path Aliases** (per package):
   - `@/` - Internal package imports
   - `@core` - Cross-package import to core
   - `@web` - Cross-package import to web
   - `@api` - Cross-package import to api

2. **Build Configuration**:
   - Standardized `tsconfig.json` with path mappings
   - Shared Vite configuration where applicable
   - Consistent test configuration across packages

3. **Lint/Format**:
   - Enforce absolute imports via ESLint rules
   - Prettier configuration at root level

---

## Phase 2: Implementation Strategy

### Package Sequence

1. **packages/core** (no dependencies)
   - Move files to feature-based structure
   - Update imports to use `@/` aliases
   - Verify all tests pass

2. **apps/web** (depends on core)
   - Reorganize into features/
   - Move tests to co-located pattern
   - Update imports to use `@/` and `@core`
   - Verify all tests pass

3. **workers/api** (standalone)
   - Reorganize into features/
   - Update imports to use `@/` aliases
   - Verify all tests pass

### Verification Checklist

- [ ] All existing tests pass
- [ ] No `../../../` relative imports remain
- [ ] Build succeeds for all packages
- [ ] E2E tests pass
- [ ] Lint checks pass

---

## Next Steps

1. Create `tasks.md` with detailed implementation tasks
2. Begin Phase 0 execution (research any remaining technical questions)
3. Proceed through package-by-package refactor

**Ready for**: `/speckit.tasks` to generate detailed task breakdown
