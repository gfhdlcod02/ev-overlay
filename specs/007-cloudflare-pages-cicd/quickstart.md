# Cloudflare Pages CI/CD - Quick Start

## Overview

Automated deployment to Cloudflare Pages via GitHub Actions.

## URLs

| Environment | URL |
|-------------|-----|
| Production | https://ev-overlay.pages.dev |
| Preview (PR) | https://<commit-hash>.ev-overlay.pages.dev |

## Workflows

### Preview Deployment (`.github/workflows/deploy-web.yml`)

| Trigger | Action |
|---------|--------|
| Pull Request | Deploy Preview |

### Production Deployment (`.github/workflows/deploy.yml`)

| Trigger | Action |
|---------|--------|
| Tag `v*.*.*` | Deploy Worker + Web to Production |

## Required Secrets

Configure at Settings > Secrets and variables > Actions:

```
CLOUDFLARE_API_TOKEN    # Cloudflare Pages:Edit permission
CLOUDFLARE_ACCOUNT_ID   # From Cloudflare dashboard
```

## Creating a Production Release

```bash
# Option 1: Create tag via CLI
git tag v1.3.0
git push --tags

# Option 2: Create GitHub Release
gh release create v1.3.0 --generate-notes
```

## Local Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm -r build

# Preview production build locally
cd apps/web && pnpm preview
```

## Manual Deployment (if needed)

```bash
# Build
pnpm -r build

# Deploy via Wrangler
npx wrangler pages deploy apps/web/dist --project-name=ev-overlay
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Deploy fails with 403 | Check GitHub token permissions (need `deployments: write`) |
| pnpm version conflict | Remove `version` from workflow, use `packageManager` in package.json |
| Build fails | Check `pnpm test` passes locally first |

## Related

- [Feature Spec](./spec.md)
- [Implementation Plan](./plan.md)
- [Tasks](./tasks.md)
