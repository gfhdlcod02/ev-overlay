# Implementation Plan: Geolocation Map Defaults

**Branch**: `003-geolocation-map-defaults` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-geolocation-map-defaults/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement automatic geolocation-based defaults for the route/map experience. On page load, the map defaults to Thailand, the Origin field auto-populates with the user's current location (if permission granted and accuracy sufficient), and the map recenters to the user's position. Includes graceful fallback to central Thailand when geolocation is denied/unavailable, loading states, and error handling.

## Technical Context

**Language/Version**: TypeScript 5.3
**Primary Dependencies**: Vue 3.4, Leaflet 1.9, Vite 5
**Storage**: sessionStorage (browser session only)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (SPA)
**Performance Goals**: Map renders within 2s; geolocation resolves within 5s
**Constraints**: Geolocation API accuracy threshold 1km; 5s timeout; respect user manual map interactions
**Scale/Scope**: Single-user client-side feature; no backend changes required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cloudflare-First | ✓ PASS | No infrastructure changes needed; pure client-side feature |
| II. Conservative Safety-First | ✓ PASS | Location data handled client-side only; privacy-respecting defaults |
| III. Deterministic Core | ✓ PASS | Geolocation logic is deterministic; pure client-side state management |
| IV. Security & Privacy | ✓ PASS | Location data never sent to server; session-only storage; no PII logging |
| V. Separation of Concerns | ✓ PASS | Feature stays in apps/web; no core or worker changes needed |
| VI. Reliability & Performance | ✓ PASS | 5s timeout + fallback defined; loading states specified |
| VII. Definition of Done | ⚠ CHECK | Requires E2E tests for geolocation flows |
| VIII. Phase-Gated | ✓ PASS | MVP-compatible feature |
| IX. Playwright Testing | ⚠ CHECK | E2E tests required for permission grant/deny flows |
| X. Code Quality | ✓ PASS | TypeScript strict mode; follows existing patterns |
| XI. Code Security | ✓ PASS | No injection vectors; no secrets involved |

**Gate Result**: PASS - Proceed to Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/003-geolocation-map-defaults/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── composables/           # Vue composables
│   │   └── useGeolocation.ts  # NEW: Geolocation composable
│   ├── stores/                # Pinia stores
│   │   └── location.ts        # MODIFY: Add geolocation state
│   ├── components/
│   │   └── map/
│   │       └── MapView.vue    # MODIFY: Add default view + recenter logic
│   └── views/
│       └── RoutePlanner.vue   # MODIFY: Integrate geolocation defaults
└── e2e/
    └── geolocation.spec.ts    # NEW: Playwright tests for geolocation flows
```

**Structure Decision**: Using the existing monorepo structure. All changes confined to `apps/web/` as this is a client-side UI feature requiring no backend or core package modifications.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All principles satisfied with straightforward client-side implementation.

---

## Post-Design Constitution Check

*Re-check after Phase 1 design completion*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cloudflare-First | ✓ PASS | Client-side only; no infrastructure changes |
| II. Conservative Safety-First | ✓ PASS | Privacy-first design; location data never leaves client |
| III. Deterministic Core | ✓ PASS | All state transitions deterministic and testable |
| IV. Security & Privacy | ✓ PASS | sessionStorage only; no PII logging; no server transmission |
| V. Separation of Concerns | ✓ PASS | Changes isolated to apps/web; clear composable/store separation |
| VI. Reliability & Performance | ✓ PASS | 5s timeout + fallback defined; contracts specify error handling |
| VII. Definition of Done | ✓ PASS | E2E test plan defined in quickstart.md |
| VIII. Phase-Gated | ✓ PASS | MVP scope maintained; no scope creep |
| IX. Playwright Testing | ✓ PASS | Test contracts defined; permission mocking documented |
| X. Code Quality | ✓ PASS | TypeScript strict; explicit interfaces; clear naming |
| XI. Code Security | ✓ PASS | No injection vectors; native APIs only; no external deps |

**Final Gate Result**: PASS - Ready for Phase 2 task generation

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | [research.md](./research.md) | Technical decisions for geolocation implementation |
| Data Model | [data-model.md](./data-model.md) | Entities, state transitions, validation rules |
| Composable Contract | [contracts/geolocation-composable.md](./contracts/geolocation-composable.md) | useGeolocation interface specification |
| Store Contract | [contracts/location-store.md](./contracts/location-store.md) | Pinia store interface specification |
| Quickstart | [quickstart.md](./quickstart.md) | Implementation guide with code examples |
| Agent Context | Updated | CLAUDE.md updated with TypeScript 5.3 + Vue 3.4, Leaflet 1.9, Vite 5 |

## Next Step

Run **`/speckit.tasks`** to generate implementation tasks based on this plan.
