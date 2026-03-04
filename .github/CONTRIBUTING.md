# Contributing to Smart EV Overlay

Thank you for your interest in contributing to Smart EV Overlay! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Build core package: `pnpm --filter @ev/core build`
4. Start dev servers: `pnpm dev`

## Development Workflow

### Branch Naming

- Features: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`

### Commit Messages

Follow conventional commits:

```
feat: add new charging stop algorithm
fix: correct distance calculation bug
docs: update API documentation
test: add E2E test for mobile viewport
```

## Code Standards

### TypeScript

- Enable strict mode
- No `any` types without justification
- Explicit return types for exported functions

### Testing

- Unit tests required for `packages/core` changes
- E2E tests for user-facing features
- All tests must pass before PR

### Linting

```bash
pnpm run lint        # Check for issues
pnpm run lint:fix    # Fix auto-fixable issues
```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation as needed
3. Add changelog entry
4. Request review from maintainers
5. Address review feedback

## Constitution Compliance

All contributions must follow the [Constitution](.specify/memory/constitution.md):

- ✅ Conservative safety defaults
- ✅ Deterministic calculations
- ✅ Security and privacy by design
- ✅ Separation of concerns

## Questions?

Open an issue for discussion before major changes.
