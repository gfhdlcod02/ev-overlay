# Contributing to Smart EV Overlay

Thank you for your interest in contributing to Smart EV Overlay! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Build core package: `pnpm --filter @ev/core build`
4. Start dev servers: `pnpm dev`

## Development Workflow

### Pull Request Required

**Direct commits to `main` are blocked.** All changes must go through a Pull Request.

We use Husky to enforce this locally and GitHub Branch Protection for remote:

| Level | Protection |
|-------|------------|
| Local | Husky pre-commit hook blocks direct commits to `main` |
| Remote | GitHub Branch Protection requires PR to merge to `main` |

### Creating a Pull Request

```bash
# 1. Create a feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. Make changes and commit
# (pre-commit hook runs tests automatically)
git add .
git commit -m "feat: add new feature"

# 3. Push to remote
git push -u origin feature/your-feature-name

# 4. Create PR (using GitHub CLI or web)
gh pr create
```

### Branch Naming

- Features: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Chores/Tooling: `chore/description`

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

1. **Pre-commit checks** (run automatically by Husky):
   - Blocks commits to `main` branch
   - Runs all tests

2. **Before submitting PR:**
   - Ensure all tests pass
   - Run linting: `pnpm run lint`
   - Update documentation as needed
   - Add changelog entry for user-facing changes

3. **After PR is created:**
   - CI checks must pass (tests, lint)
   - Request review from maintainers
   - Address review feedback
   - Squash-merge to `main` when approved

## Constitution Compliance

All contributions must follow the [Constitution](.specify/memory/constitution.md):

- ✅ Conservative safety defaults
- ✅ Deterministic calculations
- ✅ Security and privacy by design
- ✅ Separation of concerns

## Questions?

Open an issue for discussion before major changes.
