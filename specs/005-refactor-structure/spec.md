# Feature Specification: Refactor Project Structure for Best Practices

**Feature Branch**: `005-refactor-structure`
**Created**: 2026-03-05
**Completed**: 2026-03-06
**Status**: Complete
**Input**: User description: "refactor project structure code for best practices"

## User Scenarios & Testing

### User Story 1 - Clear Code Organization (Priority: P1)

As a developer working on the EV Overlay project, I want the codebase to follow consistent organizational patterns so that I can quickly locate and modify any feature without searching through multiple locations.

**Why this priority**: This is foundational for all future development. Poor code organization significantly slows development velocity, increases bug introduction risk, and makes onboarding new developers difficult.

**Independent Test**: A developer unfamiliar with the project can locate the code for any given feature (e.g., "route calculation", "geolocation") in under 2 minutes by following predictable folder structure conventions.

**Acceptance Scenarios**:

1. **Given** a new developer joins the team, **When** they need to fix a bug in trip planning, **Then** they can locate the relevant files without asking existing team members
2. **Given** a feature needs enhancement, **When** searching for related code, **Then** all related files (types, services, components, tests) are found in predictable locations
3. **Given** the project has multiple packages (core, web, api), **When** navigating between them, **Then** each follows the same organizational pattern

---

### User Story 2 - Separation of Concerns (Priority: P1)

As a developer, I want clear boundaries between different types of code (UI, business logic, data access, configuration) so that changes in one area don't unexpectedly affect others.

**Why this priority**: Proper separation prevents regression bugs, makes testing easier, and allows different parts of the system to evolve independently.

**Independent Test**: A developer can modify the UI layer without needing to understand or touch business logic code, and vice versa.

**Acceptance Scenarios**:

1. **Given** a UI component needs styling changes, **When** making those changes, **Then** no business logic files need modification
2. **Given** an API endpoint behavior needs to change, **When** updating the handler, **Then** frontend components remain unaffected
3. **Given** a data model changes, **When** updating types, **Then** the impact is isolated and migration path is clear

---

### User Story 3 - Dependency Management (Priority: P2)

As a maintainer, I want clear dependency relationships between modules so that circular dependencies are eliminated and the build process is optimized.

**Why this priority**: Circular dependencies cause build issues, make testing difficult, and indicate poor architectural boundaries. Clear dependencies enable parallel development and faster builds.

**Independent Test**: The dependency graph between packages shows a clear hierarchy with no cycles, and build times improve.

**Acceptance Scenarios**:

1. **Given** the project dependency graph is analyzed, **When** checking for circular dependencies, **Then** none exist between core, web, and api packages
2. **Given** changes are made to the core package, **When** rebuilding, **Then** only dependent packages (not all) need rebuild
3. **Given** a developer works on the web package, **When** running tests, **Then** they don't need to build unrelated packages

---

### User Story 4 - Configuration Management (Priority: P2)

As an operations engineer, I want all configuration centralized and separated from code so that environment-specific settings can be changed without code modifications.

**Why this priority**: Proper configuration management is essential for deployments across different environments (dev, staging, production) and for security (keeping secrets out of code).

**Independent Test**: A deployment to a new environment only requires configuration changes, no code changes.

**Acceptance Scenarios**:

1. **Given** a new environment needs setup, **When** configuring deployment, **Then** only environment variables and config files need changes
2. **Given** a secret needs rotation, **When** updating it, **Then** no code files are modified
3. **Given** default settings need adjustment, **When** changing them, **Then** the location is predictable and documented

---

### Edge Cases

- **Breaking changes during refactor**: How do we ensure existing functionality remains intact during structural changes?
- **Import path changes**: How do we handle moved files without breaking existing imports?
- **Mixed module systems**: How do we handle ESM/CJS compatibility during restructuring?
- **Test file organization**: How do we ensure tests remain discoverable and maintainable?

## Requirements

### Functional Requirements

- **FR-001**: Each package (core, web, api) MUST follow a consistent folder structure with clear separation between types of code (types, services, components, utils, tests)
- **FR-002**: Configuration files (environment variables, build configs) MUST be separated from source code and follow consistent naming conventions
- **FR-003**: Related functionality MUST be grouped in feature-based directories rather than type-based where appropriate
- **FR-004**: Shared types and utilities MUST be located in predictable, well-documented locations
- **FR-005**: Test files MUST be co-located with source files or in a predictable parallel structure
- **FR-006**: All imports MUST use absolute paths or path aliases instead of relative paths that break during refactoring
- **FR-007**: Build configuration MUST be standardized across all packages with shared scripts where possible

### Key Entities

- **Package**: A deployable unit (core, web, api) with its own dependencies and build configuration
- **Module**: A logical grouping of related functionality within a package
- **Configuration**: Environment-specific settings separate from implementation code
- **Shared Types**: Type definitions used across multiple packages

### Terminology Glossary

| Term | Definition | Example |
|------|------------|---------|
| **Package** | A deployable unit with its own `package.json`, dependencies, and build output | `packages/core`, `apps/web`, `workers/api` |
| **Feature** | A domain-specific grouping of related code at the top level of a package | `features/trip-planning/`, `features/map/` |
| **Module** | A logical subdivision within a feature by code type | `components/`, `composables/`, `handlers/` |
| **Co-located Tests** | Test files placed in the same directory as the source file they test | `api-client.ts` + `api-client.test.ts` |

## Success Criteria

### Measurable Outcomes

- **SC-001**: New developers can locate any feature's code in under 2 minutes without assistance
- **SC-002**: Build time improves by at least 20% due to better organization and reduced circular dependencies
- **SC-003**: Code review time reduces by 30% due to predictable structure and clear separation of concerns
  - *Measurement*: Median time from PR open to first approval (GitHub API data)
  - *Baseline*: Measure last 20 PRs before refactor; exclude PRs >500 lines, weekend PRs
  - *Calculation*: `(median_baseline - median_post) / median_baseline * 100`
  - *Data collection*: `gh pr list --state merged --limit 20 --json number,createdAt,reviews`
- **SC-004**: Zero circular dependencies exist between core, web, and api packages
- **SC-005**: 100% of configuration is externalized (no hardcoded environment-specific values in source code)
- **SC-006**: All import paths use aliases or absolute paths (no `../../../` style relative imports)

## Clarifications

### Session 2026-03-05

- **Q**: Should this refactor be done incrementally or as a single coordinated change? → **A**: Incremental package-by-package approach, starting with core, then web, then api
- **Q**: Which test organization strategy should be used consistently? → **A**: Co-located tests - test files sit next to source files (e.g., `api-client.ts` and `api-client.test.ts` in same folder)
- **Q**: Should the folder structure prioritize feature-based or type-based organization? → **A**: Hybrid approach - top-level by feature/domain, sub-folders by type within each feature
- **Q**: What is the primary method for ensuring no regressions during refactoring? → **A**: Continuous test validation - automated test suite must pass after each package refactor
- **Q**: What alias prefix convention should be used for imports? → **A**: `@` prefix with package name - use `@core`, `@web`, `@api` for cross-package, and `@/` for internal package imports

## Assumptions

1. **Existing functionality preserved**: All current features continue to work after refactoring
2. **Test coverage maintained**: Existing tests continue to pass without modification
3. **Gradual migration acceptable**: Refactoring can be done incrementally rather than in one large change
4. **Team training**: Developers will be briefed on new conventions after refactoring
5. **Refactoring sequence**: Packages will be refactored in order: core → web → api
