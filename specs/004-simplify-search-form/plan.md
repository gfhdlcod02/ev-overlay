# Implementation Plan: Simplify Search Form

**Branch**: `004-simplify-search-form` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-simplify-search-form/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Convert Origin and Destination inputs to plain text fields by removing all autocomplete/typeahead behavior. Implement request deduplication, LRU caching (60s TTL, 50 entries max), and request cancellation to prevent API over-calling while maintaining existing validation and UX. All changes are client-side within the Vue 3 frontend; API contracts remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.3, Node 20+
**Primary Dependencies**: Vue 3.4, Vite 5, Leaflet 1.9 (existing stack)
**Storage**: Client-side memory cache (Map/WeakMap), sessionStorage for location
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), mobile + desktop
**Project Type**: Web application (Vue 3 SPA)
**Performance Goals**: Search API response <2s, cache hits <50ms, UI remains responsive during searches
**Constraints**: No server-side changes, preserve existing API contracts, zero autocomplete API calls during typing
**Scale/Scope**: Single user session, max 50 cached searches, 60s cache TTL

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Status  | Notes                                                                         |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| I. Cloudflare-First Infrastructure     | [PASS] | No infrastructure changes; client-side only                                   |
| II. Conservative Safety-First UX       | [PASS] | No changes to safety calculations or defaults                                 |
| III. Deterministic Core Logic          | [PASS] | No changes to EV estimation logic (packages/core untouched)                   |
| IV. Security & Privacy by Design       | [PASS] | Location data remains client-side; no PII changes                             |
| V. Separation of Concerns Architecture | [PASS] | Changes isolated to `apps/web` (UI layer); `core` and `api` unchanged         |
| VI. Reliability & Performance          | [PASS] | Adding caching improves reliability; request cancellation prevents stale data |
| VII. Definition of Done Quality Gate   | [PASS] | Will include unit tests for cache/dedup logic and E2E tests for UX            |
| VIII. Phase-Gated Delivery             | [PASS] | Within MVP scope; no Phase 2+ dependencies                                    |
| IX. Playwright Web Testing             | [PASS] | E2E tests will cover new behavior                                             |
| X. Code Quality Standards              | [PASS] | TypeScript strict mode; no new dependencies requiring review                  |
| XI. Code Security Standards            | [PASS] | No new external dependencies; URL encoding already handled                    |

**Gate Result**: [PASS] ALL CLEAR - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/004-simplify-search-form/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/                  # Vue 3 frontend (changes here)
├── src/
│   ├── components/
│   │   ├── TripInputForm.vue      # Modify: remove autocomplete, ensure plain text inputs
│   │   └── EVParameterInputs.vue  # No changes
│   ├── composables/
│   │   ├── useTripInput.ts        # Minor: ensure no input watchers trigger API calls
│   │   ├── useRoutePlanning.ts    # Modify: integrate request cache/dedup
│   │   └── useGeolocation.ts      # No changes
│   ├── services/
│   │   ├── api-client.ts          # Modify: add request cache, dedup, cancellation
│   │   └── request-cache.ts       # NEW: LRU cache with TTL implementation
│   ├── stores/
│   │   └── location.ts            # No changes
│   ├── utils/
│   │   └── coordinates.ts         # No changes (already handles coordinate parsing)
│   └── types/
│       └── index.ts               # May add: CacheEntry, PendingRequest types
├── tests/
│   └── e2e/
│       ├── trip-planning.spec.ts  # Modify: update for no-autocomplete behavior
│       └── api-client.spec.ts     # NEW: test cache, dedup, cancellation

packages/core/             # No changes (deterministic logic untouched)

workers/api/               # No changes (API contracts preserved)
```

**Structure Decision**: Monorepo with `apps/web` (Vue 3 SPA), `packages/core` (shared logic), and `workers/api` (Cloudflare Worker). All changes are isolated to `apps/web` - specifically `api-client.ts` (new caching layer), `useRoutePlanning.ts` (integration), and `TripInputForm.vue` (remove any autocomplete UI).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles pass. No complexity justification needed.

---

## Phase 0: Research

**Status**: [COMPLETE]

**Output**: [research.md](./research.md)

### Research Findings

| Area                  | Decision                           | Rationale                                        |
| --------------------- | ---------------------------------- | ------------------------------------------------ |
| Request deduplication | Pending request Map                | Simple, proven, no dependencies                  |
| Caching               | Custom LRU (50 entries, 60s TTL)   | Avoids new dependencies, sufficient for use case |
| Cancellation          | AbortController                    | Native API, works with fetch                     |
| Normalization         | Lowercase + trim + collapse spaces | Handles common user input variations             |
| Vue integration       | Internal changes only              | Maintains backward compatibility                 |

**No external dependencies required**.

---

## Phase 1: Design

**Status**: [COMPLETE]

### Generated Artifacts

| Artifact     | File                                                         | Description                                                           |
| ------------ | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Data Model   | [data-model.md](./data-model.md)                             | CacheEntry, PendingRequest, SearchCache, RequestDeduplicator entities |
| API Contract | [contracts/search-service.md](./contracts/search-service.md) | Internal API (unchanged per FR-010)                                   |
| Quickstart   | [quickstart.md](./quickstart.md)                             | Development setup, testing checklist, debugging guide                 |

### Design Summary

**New Components**:

1. `SearchCache` class - LRU cache with TTL (apps/web/src/services/request-cache.ts)
2. `RequestDeduplicator` class - In-flight request management (integrated in api-client.ts)

**Modified Components**:

1. `api-client.ts` - Add cache layer, dedup logic, AbortController
2. `useRoutePlanning.ts` - Integrate new API client features
3. `TripInputForm.vue` - Verify plain text inputs (no autocomplete attributes)

**Unchanged Components**:

- `packages/core/` - No changes to deterministic logic
- `workers/api/` - API contracts preserved
- Geolocation auto-populate behavior
- Form validation rules

### Constitution Re-check

**Post-design verification**: All principles still pass. Design adheres to:

- Separation of concerns (changes isolated to `apps/web`)
- No server-side changes
- Client-side caching improves reliability
- No new external dependencies

---

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement following the task breakdown
3. Test using the quickstart.md checklist
