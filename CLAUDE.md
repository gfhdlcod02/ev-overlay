# ev-overlay Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Active Technologies

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
workers/api/       # Cloudflare Worker API
specs/             # Feature documentation
├── 001-smart-ev-overlay/
├── 002-rate-limiting/
├── 003-geolocation-map-defaults/
└── 004-simplify-search-form/      # Current feature
```

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

## Recent Changes

- 004-simplify-search-form: Added TypeScript 5.3, Node 20+ + Vue 3.4, Vite 5, Leaflet 1.9 (existing stack)
- **2026-03-03**: Added automated version management - sync to all packages, inject to builds, API endpoint
- **2026-03-03**: Implemented 003-geolocation-map-defaults - Geolocation-based map defaults with Thailand fallback

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
- `apps/web/src/stores/location.ts` - Pinia store for location state
- `apps/web/src/composables/useGeolocation.ts` - Geolocation API composable
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
