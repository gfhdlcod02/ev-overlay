# ADR-005: Feature-Based Architecture Refactor

## Status

**Accepted** - Implemented March 2026

## Context

The codebase had grown organically with a layer-based organization (`components/`, `composables/`, `stores/`, etc.). As features multiplied, this structure led to:

- Scattered feature code across multiple folders
- Difficulty locating related files
- Deep relative imports (`../../../stores/location`)
- Unclear boundaries between features

## Decision

Adopt a **feature-based folder structure** with path aliases for all internal imports.

### New Structure

```
apps/web/src/
├── config/              # Centralized configuration
├── features/            # Feature-based organization
│   ├── ev-params/       # EV parameter inputs
│   ├── map/             # Route map, geolocation
│   ├── trip-planning/   # Trip input, results
│   └── ui/              # Shared UI components
├── services/            # API client, caching
├── types/               # TypeScript definitions
└── utils/               # Utility functions

workers/api/src/
├── config/              # Centralized configuration
├── features/            # Feature-based organization
│   ├── rate-limiting/   # Rate limiting
│   ├── routing/         # Route handlers, OSRM, cache
│   └── shared/          # Cross-cutting (CORS)
└── index.ts             # Entry point
```

### Import Conventions

```typescript
// ✅ Internal imports use @/ alias
import { useTripInput } from '@/features/trip-planning/composables/useTripInput'
import { API_CONFIG } from '@/config'

// ✅ Cross-package imports use package names
import type { Route } from '@ev/core'

// ❌ Never use deep relative imports
import { something } from '../../../utils/helpers'
```

## Consequences

### Positive

- **Cohesion**: Related files live together in feature folders
- **Discoverability**: Easy to find all code for a feature
- **Import clarity**: `@/features/map/stores/location` vs `../../../stores/location`
- **Scalability**: New features don't clutter existing folders
- **Refactoring safety**: Clear boundaries reduce unintended impacts

### Negative

- **Migration effort**: Required moving ~40 files and updating imports
- **Learning curve**: Team needs to understand new conventions
- **Tooling setup**: Required vitest config for `@/` resolution in tests

### Neutral

- **File count**: Same number of files, just better organized
- **Bundle size**: No impact on built output

## Implementation

### Phase 1: Core Package
- Moved tests from `tests/unit/` to `src/` (colocation)
- Updated imports to use relative paths (no `@/` in libraries)

### Phase 2: Web App
- Created `features/` with subfolders for each domain
- Moved components, composables, stores to feature folders
- Created `config/index.ts` for centralized configuration
- Updated all imports to use `@/` aliases

### Phase 3: API Worker
- Created `features/` with rate-limiting, routing, shared
- Moved handlers, providers, cache to feature folders
- Created `config/index.ts` for Worker configuration
- Created `vitest.config.ts` for test resolution

### Phase 4: Configuration
- Audited for hardcoded values
- Created centralized config loaders
- Updated `.env.example` files with all options

## Verification

| Metric | Before | After |
|--------|--------|-------|
| `../../../` imports | 12 | 0 |
| `@/` imports | 0 | 44 |
| Test pass rate | 100% | 100% |
| Build time | ~8s | ~6s |
| Lint errors | 0 | 0 |

## References

- [Feature-Based Organization - Angular Style Guide](https://angular.io/guide/styleguide#feature-modules)
- [Bulletproof React - Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- Original specification: `specs/005-refactor-structure/`
