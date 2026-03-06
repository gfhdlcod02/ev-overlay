# Migration Guide: Feature 005 Refactor

This guide helps developers understand the changes introduced in Feature 005 (Project Structure Refactoring).

## What Changed

### 1. Folder Structure

**Before**: Type-based organization
```
src/
├── components/
├── composables/
├── services/
└── stores/
```

**After**: Feature-based organization with type sub-folders
```
src/
├── features/
│   ├── trip-planning/
│   │   ├── components/
│   │   ├── composables/
│   │   └── index.ts
│   └── map/
│       ├── components/
│       └── composables/
└── services/
```

### 2. Import Paths

**Before**: Relative imports
```typescript
import { useTripInput } from '../../composables/useTripInput'
import { apiClient } from '../../../services/api-client'
```

**After**: Path aliases
```typescript
import { useTripInput } from '@/features/trip-planning/composables/useTripInput'
import { apiClient } from '@/services/api-client'
```

### 3. Test File Location

**Before**: Tests in separate `tests/` folder
```
tests/
├── unit/
│   └── api-client.test.ts
```

**After**: Co-located tests
```
src/
├── services/
│   ├── api-client.ts
│   └── api-client.test.ts  # Next to source
```

## How to Update Your Code

### Finding Moved Files

Use this mapping to locate files in the new structure:

| Old Location | New Location |
|--------------|--------------|
| `src/components/TripInputForm.vue` | `src/features/trip-planning/components/TripInputForm.vue` |
| `src/components/TripSummary.vue` | `src/features/trip-planning/components/TripSummary.vue` |
| `src/components/RouteMap.vue` | `src/features/map/components/RouteMap.vue` |
| `src/composables/useTripInput.ts` | `src/features/trip-planning/composables/useTripInput.ts` |
| `src/composables/useGeolocation.ts` | `src/features/map/composables/useGeolocation.ts` |
| `src/stores/location.ts` | `src/features/map/stores/location.ts` |
| `tests/unit/*.test.ts` | Next to source file (e.g., `src/services/*.test.ts`) |

### Updating Imports

**In apps/web:**

```typescript
// Components
import TripInputForm from '@/features/trip-planning/components/TripInputForm.vue'

// Composables
import { useTripInput } from '@/features/trip-planning/composables/useTripInput'

// Services
import { apiClient } from '@/services/api-client'

// Cross-package (core)
import type { Route } from '@core/types'
```

**In packages/core:**

```typescript
// Internal imports
import { haversineDistance } from '@/utils/haversine'
```

**In workers/api:**

```typescript
// Internal imports
import { handleRoute } from '@/features/routing/handlers/route'
```

## Common Issues

### Issue: "Cannot find module '@/...'"

**Solution**: Ensure your IDE has loaded the TypeScript configuration:
1. Restart TypeScript server (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
2. Check that `tsconfig.json` has the correct `paths` configuration

### Issue: ESLint warning about relative imports

**Solution**: Convert to path alias:
```typescript
// ❌ Before
import { foo } from '../../../utils/foo'

// ✅ After
import { foo } from '@/utils/foo'
```

### Issue: Tests not found

**Solution**: Tests are now co-located. Update your test pattern if needed:
```json
// vitest.config.ts
include: ['src/**/*.test.ts']
```

## Benefits of New Structure

1. **Feature Discoverability**: All code related to a feature is in one place
2. **Clear Boundaries**: Separation of concerns between features
3. **Easier Refactoring**: Move entire features as a unit
4. **Better Testing**: Co-located tests make coverage obvious
5. **Simpler Imports**: Path aliases eliminate `../../../` hell

## Questions?

See `docs/project-structure.md` for detailed conventions.
