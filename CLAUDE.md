# ev-overlay Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-06

## Active Technologies
- TypeScript 5.3, Node 20+ + Vue 3.4, Vite 5, Cloudflare Workers (005-refactor-structure)
- N/A (structural refactor only) (005-refactor-structure)

- TypeScript 5.3 + Vue 3.4, Leaflet 1.9, Vite 5 (003-geolocation-map-defaults)
- sessionStorage (browser session only) (003-geolocation-map-defaults)
- TypeScript 5.3, Node 20+ + Vue 3.4, Vite 5, Leaflet 1.9 (existing stack) (004-simplify-search-form)
- Client-side memory cache (Map/WeakMap), sessionStorage for location (004-simplify-search-form)

- **Frontend**: Vue 3.4, Vite 5, Leaflet 1.9
- **Backend**: Cloudflare Workers runtime
- **Language**: TypeScript 5.3, Node 20+
- **Storage**: Cloudflare KV (route caching, 7-day TTL)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Package Manager**: pnpm 8+
- **Git Hooks**: Husky (pre-commit)

## Project Structure

```text
packages/core/     # Pure deterministic TS logic
apps/web/          # Vue 3 + Vite frontend
├── src/config/    # Centralized configuration
├── src/features/  # Feature-based organization
│   ├── ev-params/     # EV parameter inputs
│   ├── map/           # Route map, geolocation
│   ├── trip-planning/ # Trip input, results
│   └── ui/            # Shared UI components
├── src/services/  # API client, caching
├── src/types/     # TypeScript definitions
└── src/utils/     # Utility functions

workers/api/       # Cloudflare Worker API
├── src/config/    # Centralized configuration
├── src/features/  # Feature-based organization
│   ├── rate-limiting/ # Rate limiting handler
│   ├── routing/       # Route handlers, OSRM, cache
│   └── shared/        # Cross-cutting (CORS)
└── tests/integration/

specs/             # Feature documentation
├── 001-smart-ev-overlay/
├── 002-rate-limiting/
├── 003-geolocation-map-defaults/
├── 004-simplify-search-form/
└── 005-refactor-structure/  # Feature-based architecture
```

## Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Package** | A deployable unit with its own `package.json`, dependencies, and build output | `packages/core`, `apps/web`, `workers/api` |
| **Feature** | A domain-specific grouping of related code at the top level of a package | `features/trip-planning/`, `features/map/` |
| **Module** | A logical subdivision within a feature by code type | `components/`, `composables/`, `handlers/` |
| **Co-located Tests** | Test files placed in the same directory as the source file they test | `api-client.ts` + `api-client.test.ts` |

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build all packages

# Testing
pnpm test             # Run all tests
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run Playwright E2E tests

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format with Prettier

# Version Management
pnpm version:sync     # Sync root version to all packages
pnpm version:inject   # Inject version into built files

# Git Hooks
pnpm prepare          # Setup Husky hooks
```

## Code Style

- TypeScript strict mode enabled
- No `any` types without justification
- Explicit return types for exported functions
- ESLint + Prettier for code quality

## Import Conventions

### Path Aliases

```typescript
// Internal imports use @/ alias
import { useTripInput } from '@/features/trip-planning/composables/useTripInput'
import { API_CONFIG } from '@/config'
import type { RouteError } from '@/types'

// Cross-package imports use package names
import type { Route, Location } from '@ev/core'
import { calculateSafeRange } from '@ev/core'
```

### Forbidden Patterns

```typescript
// ❌ Never use deep relative imports
import { something } from '../../../utils/helpers'

// ❌ Never import from outside package scope
import { internal } from '../../node_modules/some-package'
```

## Feature-Based Architecture

The codebase follows a feature-based organization pattern:

### apps/web/src/features/

| Feature | Purpose | Key Files |
|---------|---------|-----------|
| `ev-params/` | EV parameter inputs | `EVParameterInputs.vue`, `LoadingState.vue` |
| `map/` | Route visualization, geolocation | `RouteMap.vue`, `useGeolocation.ts`, `location.ts` |
| `trip-planning/` | Trip input and results | `TripInputForm.vue`, `TripSummary.vue`, `ChargingStopList.vue` |
| `ui/` | Shared UI components | `ErrorDisplay.vue` |

### workers/api/src/features/

| Feature | Purpose | Key Files |
|---------|---------|-----------|
| `rate-limiting/` | API rate limiting | `rate-limit.ts` |
| `routing/` | Route calculation, caching | `route.ts`, `osrm-client.ts`, `kv-cache.ts`, `normalize.ts` |
| `shared/` | Cross-cutting concerns | `cors.ts` |

### Benefits

- **Cohesion**: Related code lives together
- **Discoverability**: Easy to find feature-related files
- **Scalability**: New features don't clutter existing folders
- **Ownership**: Clear boundaries for refactoring

### Measuring Success (005-refactor-structure)

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| Code Location Time | Developer time-to-find exercise | < 2 minutes |
| Build Time | `time pnpm build` | Baseline + 20% improvement |
| Review Time | GitHub PR median time-to-approval | Baseline + 30% improvement |
| Circular Dependencies | `npm ls` or madge analysis | Zero cycles |
| Config Externalization | Audit source for hardcoded env values | 100% externalized |
| Import Quality | Grep for `../../../` patterns | Zero deep relative imports |

**Review Time Calculation**:
```bash
# Extract PR review times from GitHub
gh pr list --state merged --limit 20 --json number,createdAt,reviews

# Calculate: (median_baseline - median_post) / median_baseline * 100
```

## Recent Changes
- 005-refactor-structure: Added TypeScript 5.3, Node 20+ + Vue 3.4, Vite 5, Cloudflare Workers

- 004-simplify-search-form: Added TypeScript 5.3, Node 20+ + Vue 3.4, Vite 5, Leaflet 1.9 (existing stack)
- **2026-03-03**: Added automated version management - sync to all packages, inject to builds, API endpoint

<!-- MANUAL ADDITIONS START -->

## Geolocation Map Defaults (003-geolocation-map-defaults)

### Features

- **Thailand Default View**: Map shows Thailand centered at Bangkok `[13.7563, 100.5018]` on initial load
- **Auto-populate Origin**: Origin field auto-fills with coordinates when geolocation permission granted
- **Map Auto-recenter**: Smooth flyTo animation (1.5s) to user location when available
- **User Interaction Respect**: Disables auto-recenter after manual map pan/zoom
- **Graceful Fallbacks**: Handles permission denied, timeout (5s), and unsupported browsers
- **Session Persistence**: Location data persisted in sessionStorage (cleared on tab close)

### Key Files

- `apps/web/src/types/location.ts` - Geolocation type definitions
- `apps/web/src/features/map/stores/location.ts` - Pinia store for location state
- `apps/web/src/features/map/composables/useGeolocation.ts` - Geolocation API composable
- `apps/web/src/utils/coordinates.ts` - Coordinate validation utilities
- `apps/web/tests/e2e/geolocation.spec.ts` - E2E tests for geolocation flows

### Privacy & Security

- Location data **never leaves the client**
- Stored only in sessionStorage (not localStorage)
- No location data sent to server
- Respects browser permission model

## Version Management

Version is managed automatically through root `package.json` and synced to all workspace packages.

### Release Workflow

```bash
# 1. Create release branch
git checkout -b release/v1.3.0

# 2. Bump version and sync
npm version 1.3.0 --no-git-tag-version
pnpm version:sync

# 3. Commit
git add -A
git commit -m "chore(release): v1.3.0"

# 4. Create PR
git push -u origin release/v1.3.0
gh pr create --title "chore(release): v1.3.0" --body "Version bump"

# 5. After merge, tag and push
git checkout main
git pull
git tag v1.3.0
git push --tags
```

### Automated Process

| Step                | Script                                  | Description                                      |
| ------------------- | --------------------------------------- | ------------------------------------------------ |
| Pre-build           | `pnpm version:sync`                     | Sync version from root to all package.json files |
| Pre-deploy (Worker) | `node scripts/inject-version-worker.js` | Inject version into Worker source                |
| Build               | `pnpm -r build`                         | Build all packages                               |
| Post-build (Web)    | `pnpm version:inject`                   | Inject version into web dist files               |

### Version Display

- **Web UI**: Displayed at bottom left corner (e.g., `v1.2.0`)
- **API**: `GET /api/version` → `{"version":"1.2.0","commit":"abc1234"}`
- **File**: `apps/web/dist/version.json` for runtime checks

### Related Files

- `scripts/sync-version.js` - Syncs version between packages
- `scripts/inject-version-worker.js` - Injects version into Worker source (pre-deploy)
- `scripts/inject-version.js` - Injects version into web dist files (post-build)
- `apps/web/src/App.vue` - Displays version in UI
- `workers/api/src/index.ts` - API version endpoint

## Simplify Search Form (004-simplify-search-form)

### Features
- **Plain Text Inputs**: Origin and Destination are plain text inputs with no autocomplete/typeahead
- **Request Deduplication**: Identical in-flight requests share the same promise
- **LRU Cache**: 60-second TTL, max 50 entries for search results
- **Request Cancellation**: AbortController cancels stale requests when new searches start
- **Preserved UX**: Existing validation, geolocation auto-populate, and error handling unchanged

### Key Files
- `apps/web/src/services/request-cache.ts` - LRU cache with TTL implementation
- `apps/web/src/services/api-client.ts` - Deduplication and cancellation logic
- `apps/web/src/components/TripInputForm.vue` - Plain text inputs with autocomplete="off"
- `apps/web/src/composables/useRoutePlanning.ts` - AbortError handling

### Technical Decisions
- Native Map for pending request deduplication (no new dependencies)
- AbortController for cancellation (native API)
- Case-insensitive, trimmed, collapsed whitespace for cache key normalization

<!-- MANUAL ADDITIONS END -->
