# Implementation Plan: Cloudflare Pages CI/CD

**Feature**: 007 - Cloudflare Pages CI/CD
**Branch**: `007-cloudflare-pages-cicd`
**Created**: 2026-03-26

## Technical Context

### Current Stack
- **Frontend**: Vue 3.4 + Vite 5 + TypeScript 5.3
- **Package Manager**: pnpm 8+ (workspace/monorepo)
- **Build Output**: `apps/web/dist/`
- **Testing**: Vitest (unit) + Playwright (E2E)

### Target Platform
- **Cloudflare Pages**: Static site hosting with CI/CD integration
- **GitHub Actions**: Build and deploy automation

## Architecture Decisions

### Decision 1: GitHub Actions over Direct Git Integration
**Choice**: Use GitHub Actions workflow instead of Cloudflare's direct Git integration
**Rationale**:
- More control over build process (pnpm workspace needs custom setup)
- Can run tests before deployment
- Easier to add custom steps (version sync, etc.)

### Decision 2: Root-level Build
**Choice**: Build from repository root, not `apps/web/`
**Rationale**:
- `@ev/core` package must be built before web app
- pnpm workspace dependencies need hoisting
- Consistent with local development (`pnpm build`)

### Decision 3: Separate Build and Deploy Jobs
**Choice**: Split workflow into `build` and `deploy` jobs
**Rationale**:
- Build job runs on all PRs (for verification)
- Deploy job only runs on `main` branch
- Enables preview deployments with separate logic

## Implementation Phases

### Phase 1: GitHub Actions Workflow
Create `.github/workflows/deploy-web.yml`
- Setup pnpm with caching
- Install dependencies
- Run version:sync
- Build all packages
- Run tests
- Deploy to Cloudflare Pages

### Phase 2: Cloudflare Pages Configuration
- Create Pages project (manual or via Wrangler)
- Configure build settings in Pages dashboard
- Set production branch to `main`

### Phase 3: Preview Deployments
- Add logic to create preview URLs for PRs
- Post PR comments with preview links

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/deploy-web.yml` | Create | Main CI/CD workflow |
| `.github/workflows/preview-web.yml` | Create | PR preview workflow (optional) |
| `apps/web/package.json` | Modify | Add build:preview script if needed |
| `CLAUDE.md` | Modify | Update deployment documentation |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Yes | For Pages deployment |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Cloudflare account ID |

## Testing Strategy

1. **Local Testing**: `pnpm build` must succeed
2. **CI Testing**: Workflow runs on PR
3. **Deployment Testing**: Verify site loads after merge

## Rollback Plan

If deployment fails:
1. Revert commit on `main`
2. Push revert to trigger new deployment
3. Or manually deploy previous version via Cloudflare dashboard

## Success Metrics

- Build time < 3 minutes
- 100% successful deployments in first week
- PRs receive preview URLs within 2 minutes of push

## Post-Deployment

- Update CLAUDE.md with deployment instructions
- Document preview URL pattern
- Set up branch protection rules (require CI pass)
