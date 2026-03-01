# Implementation Plan: Smart EV Overlay for Google Maps

**Branch**: `001-smart-ev-overlay` | **Date**: 2026-03-01 | **Status**: ✅ Complete
**Spec**: [spec.md](./spec.md) | **Deployed**: [https://fc6ea9ab.ev-overlay.pages.dev](https://fc6ea9ab.ev-overlay.pages.dev)
**Input**: Feature specification from `/specs/001-smart-ev-overlay/spec.md`

## Summary

Build a Cloudflare-first web application that helps EV drivers plan trips by visualizing safe driving ranges and suggesting virtual charging stops. The app accepts trip parameters (origin, destination, SoC, range, driving mode), fetches routes via a Cloudflare Worker proxy, calculates conservative safe ranges using deterministic formulas, visualizes safe/risky segments on an interactive map, and provides Google Maps handoff with waypoint generation.

## Technical Context

**Language/Version**: TypeScript 5.3, Node 20+
**Primary Dependencies**:
- Frontend: Vue 3.4, Vite 5, Leaflet 1.9
- Worker: Cloudflare Workers runtime
- Testing: Vitest (unit), Playwright (E2E)
**Storage**: Cloudflare KV (route caching, 7-day TTL)
**Testing**: Vitest for unit tests, Playwright for E2E tests
**Target Platform**: Cloudflare Pages (frontend), Cloudflare Workers (API)
**Project Type**: web-service (Cloudflare-first edge application)
**Performance Goals**: <30 seconds trip input to visualization, <200ms cached route responses
**Constraints**: Zero-cost infrastructure (Cloudflare free tier), no secrets in client bundle, WCAG 2.1 Level AA accessibility
**Scale/Scope**: Single-user MVP, no authentication required, virtual stops only (no real charger DB)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cloudflare-First | ✅ PASS | All infrastructure on Cloudflare platform |
| II. Conservative Safety-First UX | ✅ PASS | Conservative defaults (20% reserve, 10km buffer) implemented |
| III. Deterministic Core Logic | ✅ PASS | Pure functions implemented, 100% unit test coverage |
| IV. Security & Privacy | ✅ PASS | No PII collection, secrets server-side only |
| V. Separation of Concerns | ✅ PASS | packages/core, apps/web, workers/api structure implemented |
| VI. Reliability & Performance | ✅ PASS | KV caching (7-day TTL), timeouts, error states implemented |
| VII. Definition of Done | ✅ PASS | All tests pass (95 total), error states handled |
| VIII. Phase-Gated Delivery | ✅ PASS | MVP Phase 1 complete and deployed |
| IX. Playwright Web Testing | ✅ PASS | E2E tests implemented for critical paths |
| X. Code Quality Standards | ✅ PASS | ESLint/Prettier configured, TypeScript strict mode |
| XI. Code Security Standards | ✅ PASS | No secrets in code, credential audit passed |

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-ev-overlay/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/core/           # Pure deterministic TS logic
├── src/
│   ├── calculator/      # Safe range, stop placement algorithms
│   ├── url-builder/     # Google Maps URL generation
│   └── types/           # Shared domain types
├── tests/
│   └── unit/            # 100% unit test coverage required
└── package.json

apps/web/                # Vue 3 + Vite frontend
├── src/
│   ├── components/      # Input forms, map controls
│   ├── composables/     # Vue composables for state
│   ├── views/           # Main page layouts
│   └── services/        # API client, map integration
├── public/
├── tests/
│   └── e2e/             # Playwright tests
├── index.html
└── package.json

workers/api/             # Cloudflare Worker
├── src/
│   ├── handlers/        # Route, health endpoints
│   ├── providers/       # OSRM/normalization
│   └── cache/           # KV caching logic
├── tests/
│   └── integration/     # Worker integration tests
├── wrangler.toml
└── package.json
```

**Structure Decision**: Monorepo with three distinct packages following Separation of Concerns principle. `core` has zero browser/Node dependencies, `web` never calls providers directly, and `api` normalizes all responses.

## Complexity Tracking

> **No constitution violations requiring justification.**

## Phase 0: Research & Outline

### Research Completed

See [research.md](./research.md) for detailed findings.

**Key Decisions:**
1. **Routing Provider**: OSRM (Open Source Routing Machine) via public demo server - free, no API key required for MVP
2. **Map Library**: Leaflet 1.9 - lightweight, well-documented, works with Cloudflare Pages
3. **State Management**: Vue 3 Composition API with `reactive()` - sufficient for single-page app complexity
4. **Package Manager**: pnpm with workspaces - efficient monorepo handling
5. **CSS Framework**: Tailwind CSS - rapid UI development, built-in accessibility utilities

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

**Core Entities:**
- `TripInput`: User-provided parameters (origin, destination, SoC, range, reserve, factor)
- `EVParameters`: Validated and normalized trip settings
- `Route`: Provider response with geometry, distance, duration
- `SafeRange`: Calculated result with buffer applied
- `ChargingStop`: Suggested stop with position and charge assumptions
- `RouteSegment`: Visual segment with safety status (safe/risky)

### Interface Contracts

See [contracts/](./contracts/) directory:
- `route-api.md`: Worker route endpoint specification
- `provider-osrm.md`: OSRM response normalization contract

### Quickstart

See [quickstart.md](./quickstart.md) for developer setup instructions.

## Implementation Notes

### Critical Implementation Requirements

1. **Deterministic Core**: All calculation logic in `packages/core` must be pure functions with no side effects. Unit tests must verify identical outputs for identical inputs.

2. **Secret Isolation**: No API keys or provider URLs in client bundle. Worker acts as secure proxy.

3. **Error Handling**: Every external call (geocode, route) must have timeout and retry logic with user-friendly error messages.

4. **Performance**: Route recomputation (when EV params change) must happen client-side using cached route geometry without re-fetching.

5. **Accessibility**: All interactive elements must have proper ARIA labels, keyboard navigation, and color contrast meeting WCAG 2.1 Level AA.

6. **E2E Testing**: Playwright tests must mock routing provider to ensure deterministic test execution.

## Next Steps

1. Run `/speckit.tasks` to generate the actionable task list
2. Begin implementation with `packages/core` (foundational logic)
3. Parallel development: `workers/api` and `apps/web` once core stabilizes
