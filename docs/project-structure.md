# Project Structure

This document describes the folder organization and naming conventions for the EV Overlay project.

## Overview

The project follows a **monorepo** structure with clear separation between packages:

```
packages/core/     # Pure TypeScript logic (deterministic calculations)
apps/web/          # Vue 3 SPA (UI and map visualization)
workers/api/       # Cloudflare Worker (API edge layer)
```

## Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Package** | A deployable unit with its own `package.json`, dependencies, and build output | `packages/core`, `apps/web`, `workers/api` |
| **Feature** | A domain-specific grouping of related code at the top level of a package | `features/trip-planning/`, `features/map/` |
| **Module** | A logical subdivision within a feature by code type | `components/`, `composables/`, `handlers/` |
| **Co-located Tests** | Test files placed in the same directory as the source file they test | `api-client.ts` + `api-client.test.ts` |

## Package Organization

Each package follows a **hybrid structure**:
- **Top level**: Organized by **feature/domain**
- **Sub-folders**: Organized by **technical type**

### packages/core

```
src/
├── calculator/          # EV estimation algorithms
│   ├── index.ts
│   ├── distance-accumulator.ts
│   ├── distance-accumulator.test.ts  # Co-located test
│   ├── segment-builder.ts
│   ├── segment-builder.test.ts
│   ├── stop-placement.ts
│   └── stop-placement.test.ts
├── utils/               # Shared utilities
│   ├── haversine.ts
│   ├── haversine.test.ts
│   └── validators.ts
└── types/
    └── index.ts         # Shared type definitions
```

### apps/web

```
src/
├── features/            # Feature-based organization
│   ├── trip-planning/   # Trip planning feature
│   │   ├── components/  # Vue components
│   │   │   ├── TripInputForm.vue
│   │   │   ├── TripSummary.vue
│   │   │   └── ChargingStopList.vue
│   │   ├── composables/ # Vue composables
│   │   │   ├── useTripInput.ts
│   │   │   └── useRoutePlanning.ts
│   │   └── index.ts     # Feature exports
│   ├── map/             # Map visualization feature
│   │   ├── components/
│   │   │   └── RouteMap.vue
│   │   ├── composables/
│   │   │   └── useGeolocation.ts
│   │   └── stores/
│   │       └── location.ts
│   └── ev-params/       # EV parameters feature
│       └── components/
│           ├── EVParameterInputs.vue
│           └── LoadingState.vue
├── services/            # Shared services
│   ├── api-client.ts
│   ├── api-client.test.ts
│   ├── request-cache.ts
│   └── request-cache.test.ts
├── utils/               # Shared utilities
│   └── coordinates.ts
└── types/
    └── index.ts
```

### workers/api

```
src/
├── features/
│   ├── routing/         # Route handling feature
│   │   ├── handlers/
│   │   │   └── route.ts
│   │   ├── providers/
│   │   │   └── osrm-client.ts
│   │   └── cache/
│   │       └── kv-cache.ts
│   └── rate-limiting/   # Rate limiting feature
│       └── handlers/
│           └── rate-limit.ts
├── handlers/
│   └── index.ts         # Main handler exports
└── types/
    └── index.ts
```

## Naming Conventions

### Files

- **Components**: PascalCase (e.g., `TripInputForm.vue`)
- **Composables**: camelCase with `use` prefix (e.g., `useTripInput.ts`)
- **Services**: camelCase (e.g., `api-client.ts`)
- **Tests**: Same name as source file + `.test.ts` suffix (e.g., `api-client.test.ts`)
- **Utils**: camelCase (e.g., `coordinates.ts`)
- **Types**: `index.ts` in types/ folder

### Directories

- **Features**: kebab-case (e.g., `trip-planning/`, `ev-params/`)
- **Technical folders**: lowercase (e.g., `components/`, `composables/`, `services/`)

## Import Conventions

### Path Aliases

Use path aliases instead of relative imports:

```typescript
// ✅ Good - Use path aliases
import { calculateSafeRange } from '@/calculator'
import type { Route } from '@core/types'

// ❌ Avoid - Deep relative imports
import { calculateSafeRange } from '../../../core/src/calculator'
```

### Available Aliases

| Alias | Package | Target |
|-------|---------|--------|
| `@/*` | All | Internal package imports |
| `@core/*` | web | packages/core/src/* |

## Test File Organization

Tests are **co-located** with source files:

```
src/
├── services/
│   ├── api-client.ts
│   └── api-client.test.ts   # Co-located test
```

Benefits:
- Obvious when tests are missing
- Simpler imports
- Easier navigation

## Configuration Files

Configuration is externalized from code:

- **Environment variables**: `.env` files (not committed)
- **Build config**: `vite.config.ts`, `tsconfig.json`
- **Linting**: Root `.eslintrc.cjs`, `.prettierrc`

## Adding New Features

1. Identify the **package** (core/web/api)
2. Create a **feature folder** under `src/features/`
3. Add **sub-folders** by type (components/, composables/, etc.)
4. Create files following **naming conventions**
5. Add **co-located tests**
6. Use **path aliases** for imports

## Migration Notes

This structure was introduced in Feature 005. See `docs/migration-guide.md` for migration details.
