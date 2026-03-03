# Quickstart Guide: Smart EV Overlay

**Feature**: 001-smart-ev-overlay

## Prerequisites

- Node.js 20+ with npm
- pnpm 8+ (`npm install -g pnpm`)
- Git

## Clone & Setup

```bash
# Clone the repository
git clone <repo-url>
cd ev-overlay

# Install dependencies
pnpm install

# Build core package (required before web/worker)
pnpm --filter @ev/core build
```

## Development

### Start All Services

```bash
# Terminal 1: Start the API worker (with hot reload)
pnpm --filter @ev/api dev

# Terminal 2: Start the web app
pnpm --filter @ev/web dev
```

### Access the App

- Web app: http://localhost:5173
- Worker: http://localhost:8787

## Testing

### Run Unit Tests (Core Logic)

```bash
# Run core unit tests
pnpm --filter @ev/core test

# Run with coverage
pnpm --filter @ev/core test:coverage
```

### Run E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time)
pnpm --filter @ev/web exec playwright install

# Run E2E tests
pnpm --filter @ev/web test:e2e

# Run with UI mode for debugging
pnpm --filter @ev/web test:e2e --ui
```

### Run Integration Tests (Worker)

```bash
pnpm --filter @ev/api test
```

## Project Structure

```
ev-overlay/
├── packages/
│   └── core/          # Pure logic (deterministic calculations)
├── apps/
│   └── web/           # Vue 3 + Vite frontend
├── workers/
│   └── api/           # Cloudflare Worker (route proxy)
└── specs/
    └── 001-smart-ev-overlay/
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run linting |
| `pnpm typecheck` | Run TypeScript checks |

## Environment Variables

Create `.env` in `workers/api/`:

```bash
# Optional: Custom OSRM endpoint (defaults to public demo)
OSRM_BASE_URL=https://router.project-osrm.org
```

## Deployment

### Deploy Worker

```bash
cd workers/api
pnpm run deploy
```

### Deploy Web App

```bash
cd apps/web
pnpm run build
# Upload dist/ to Cloudflare Pages
```

## Troubleshooting

### Port Conflicts

- Web dev server uses port 5173 (Vite default)
- Worker dev server uses port 8787 (Wrangler default)

### Cache Issues

```bash
# Clear all build caches
pnpm clean
pnpm install
```

### OSRM Rate Limiting

The public OSRM demo server has rate limits. If you see 429 errors:
1. Add delays between requests in development
2. Consider setting up a local OSRM instance for heavy testing

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   apps/web  │────▶│ workers/api │────▶│   OSRM      │
│  (Vue 3)    │     │  (Worker)   │     │  (routes)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │
       │             ┌──────┴──────┐
       │             │  Cloudflare  │
       └────────────▶│     KV       │
  packages/core      │   (cache)    │
  (calculations)     └─────────────┘
```

## Next Steps

1. Read the [specification](./spec.md) for feature details
2. Review the [data model](./data-model.md) for entity definitions
3. Check [API contracts](./contracts/) for interface specifications
