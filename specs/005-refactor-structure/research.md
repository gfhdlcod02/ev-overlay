# Research: Project Structure Refactoring

**Feature**: 005-refactor-structure
**Date**: 2026-03-05

## Research Questions

### Q1: What is the best folder structure for TypeScript monorepos?

**Decision**: Hybrid approach - feature-based top level with type-based sub-organization

**Rationale**:
- Feature-based organization makes code discoverable by domain
- Type-based sub-folders maintain separation of concerns
- Balances discoverability with architectural clarity
- Matches modern frontend best practices (React/Vue community standards)

**Alternatives considered**:
- Pure type-based (services/, components/, utils/) - rejected: features scattered across folders
- Pure feature-based (everything in one folder per feature) - rejected: mixes concerns, harder to find all services

---

### Q2: Where should test files be located?

**Decision**: Co-located with source files

**Rationale**:
- Imports are simpler (same directory)
- Obvious when tests are missing for a file
- Easier navigation (file + test together)
- Supported by Vitest and Jest out of the box

**Alternatives considered**:
- Parallel `tests/` directory - rejected: harder to maintain mirrored structure

---

### Q3: What import alias convention should be used?

**Decision**: `@` prefix with package names

**Rationale**:
- `@` prefix is industry standard in TypeScript/JavaScript
- Clear distinction between:
  - `@core`, `@web`, `@api` - cross-package imports
  - `@/` - internal package imports
- Supported by TypeScript path mapping and Vite

**Alternatives considered**:
- `~` prefix - less common, less tooling support
- No prefix - conflicts with npm package names

---

### Q4: What order should packages be refactored?

**Decision**: core → web → api

**Rationale**:
- `core` has no dependencies - safest starting point
- `web` depends on `core` - can leverage core's new structure
- `api` is standalone - can be done last without blocking

---

## Technical Decisions Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Folder structure | Hybrid (feature + type) | Balances discoverability and separation |
| Test location | Co-located | Simpler imports, obvious coverage |
| Import aliases | `@` prefix | Industry standard, clear distinction |
| Refactor order | core → web → api | Dependency order, minimal risk |
| Verification | Per-package tests | Early failure detection |

## References

- TypeScript Project References: https://www.typescriptlang.org/docs/handbook/project-references.html
- Vitest Configuration: https://vitest.dev/config/
- Vite Path Aliases: https://vitejs.dev/config/shared-options.html#resolve-alias
