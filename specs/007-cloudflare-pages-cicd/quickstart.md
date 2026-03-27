# Cloudflare Pages CI/CD - Quick Start

## Overview

Automated deployment to Cloudflare Pages via GitHub Actions.

## URLs

| Environment | URL |
|-------------|-----|
| Production | https://ev-overlay.pages.dev |
| Preview (PR) | https://<commit-hash>.ev-overlay.pages.dev |

## Workflows

### Continuous Deployment (`.github/workflows/deploy-web.yml`)

| Trigger | Branch | Action |
|---------|--------|--------|
| Push | `main` | Deploy to Production |
| Pull Request | `main` | Deploy Preview |

### Release Deployment (`.github/workflows/deploy.yml`)

| Trigger | Action |
|---------|--------|
| Tag `v*.*.*` | Deploy Worker + Web to Production |

## Required Secrets

Configure at Settings > Secrets and variables > Actions:

```
CLOUDFLARE_API_TOKEN    # Cloudflare Pages:Edit permission
CLOUDFLARE_ACCOUNT_ID   # From Cloudflare dashboard
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
