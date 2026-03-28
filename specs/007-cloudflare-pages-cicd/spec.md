# Feature: Cloudflare Pages CI/CD

**Status**: Specification Complete
**Created**: 2026-03-26
**Branch**: `007-cloudflare-pages-cicd`

## Summary

Enable automated deployment of the EV Overlay frontend to Cloudflare Pages with preview environments for pull requests.

## Motivation

Currently the frontend only runs on a local development server (`pnpm dev`). To make the application accessible to users, we need production hosting with automated deployments triggered by code changes.

## User Scenarios

### Scenario 1: Developer Pushes to Main
**As a** developer
**When** I push changes to the `main` branch
**Then** the application builds and deploys to production automatically
**And** I receive confirmation when deployment completes

### Scenario 2: Developer Creates Pull Request
**As a** developer
**When** I create or update a pull request
**Then** a preview deployment is created with a unique URL
**And** I can share this URL for testing before merging

### Scenario 3: Failed Build Blocks Deployment
**As a** developer
**When** the build or tests fail
**Then** deployment is blocked
**And** I receive notification of the failure with error details

## Functional Requirements

### FR-1: Production Deployment
- **Given** code is pushed to `main` branch
- **When** the CI/CD pipeline runs
- **Then** the application deploys to production Cloudflare Pages site
- **And** the deployment uses zero-downtime strategy

### FR-2: Preview Deployments
- **Given** a pull request is opened or updated
- **When** the CI/CD pipeline runs
- **Then** a preview deployment is created
- **And** the preview URL is posted as a PR comment

### FR-3: Build Verification
- **Given** code changes are pushed
- **When** the pipeline executes
- **Then** all tests must pass before deployment
- **And** build warnings are reported but don't block deployment

### FR-4: Build Optimization
- **Given** the pipeline runs
- **When** dependencies are cached
- **Then** build time must complete in under 3 minutes
- **And** incremental builds are used where possible

## Acceptance Criteria

| ID | Criteria | Verification Method |
|----|----------|---------------------|
| AC-1 | Push to main triggers deployment | Push test commit, verify deployment |
| AC-2 | PR creates preview deployment | Create test PR, verify preview URL |
| AC-3 | Build failures block deployment | Introduce build error, verify block |
| AC-4 | Build completes under 3 minutes | Measure build time in CI logs |
| AC-5 | Preview URL accessible publicly | Visit preview URL from external network |

## Success Criteria

- Users can access the production site at a stable URL
- PRs receive unique preview URLs for testing
- Build time averages under 3 minutes
- Zero failed deployments due to build issues in first month

## Out of Scope

- Custom domain configuration (Phase 2)
- Performance monitoring/alerting
- Rollback automation
- Multi-environment deployments (staging, etc.)

## Assumptions

- Cloudflare account with Pages access is available
- GitHub repository has Actions enabled
- No sensitive build-time environment variables required
- Node.js 20+ available in CI environment

## Dependencies

- Cloudflare Pages service
- GitHub Actions
- pnpm package manager

## Notes

- Uses monorepo structure (pnpm workspace)
- Build depends on `@ev/core` package being built first
- Output directory: `apps/web/dist/`
