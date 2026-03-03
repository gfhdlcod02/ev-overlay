# ev-overlay Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Active Technologies
- TypeScript 5.3 + Vue 3.4, Leaflet 1.9, Vite 5 (003-geolocation-map-defaults)
- sessionStorage (browser session only) (003-geolocation-map-defaults)

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
└── 003-geolocation-map-defaults/  # Current feature
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

# Git Hooks
pnpm prepare          # Setup Husky hooks
```

## Code Style

- TypeScript strict mode enabled
- No `any` types without justification
- Explicit return types for exported functions
- ESLint + Prettier for code quality

## Recent Changes
- **2026-03-03**: Implemented 003-geolocation-map-defaults - Geolocation-based map defaults with Thailand fallback
- **2026-03-03**: Added Pinia for state management, geolocation composable, sessionStorage persistence
- **2026-03-03**: Added E2E tests for geolocation flows (grant/deny/timeout scenarios)
- **2026-03-03**: Added unit tests for coordinate validation and location store
- **2026-03-03**: Added Husky pre-commit hook to enforce PR workflow
- **002-rate-limiting**: Added API rate limiting (60 req/min per IP)

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

<!-- MANUAL ADDITIONS END -->
