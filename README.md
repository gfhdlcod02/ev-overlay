# Smart EV Overlay for Google Maps

A Cloudflare-first web application that helps EV drivers plan trips by visualizing safe driving ranges and suggesting virtual charging stops.

**Live Demo**: [https://ev-overlay.pages.dev/](https://ev-overlay.pages.dev/)
**API Endpoint**: [https://ev-overlay-api.gfhdlcod02.workers.dev/api/route](https://ev-overlay-api.gfhdlcod02.workers.dev/api/route)

## Features

- **Trip Planning**: Enter origin, destination, and EV parameters (SoC, range, reserve, driving mode)
- **Geolocation Map Defaults**: Auto-detects user location to set origin and center map (Thailand default)
- **Safe Range Calculation**: Deterministic conservative range estimates with safety margins
- **Route Visualization**: Interactive map with safe (green) and risky (red) segment coloring
- **Charging Stops**: Automatic placement of virtual charging stops along route
- **Google Maps Handoff**: One-click navigation with waypoints
- **Responsive Design**: Works on desktop and mobile devices
- **Fast Performance**: Route caching with 7-day TTL
- **Rate Limiting**: 60 requests/minute per IP for API protection

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account (for deployment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ev-overlay

# Install dependencies
pnpm install

# Setup git hooks (Husky)
pnpm prepare

# Start development server
pnpm dev
```

The development server will start at `http://localhost:3000`

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @ev/core build
pnpm --filter @ev/web build
pnpm --filter @ev/api build
```

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm --filter @ev/core test

# Run integration tests
pnpm --filter @ev/api test

# Run E2E tests
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage
```

### Linting

```bash
# Run linter
pnpm run lint

# Fix lint issues
pnpm run lint:fix
```

## Project Structure

```
ev-overlay/
├── packages/core/          # Pure deterministic TypeScript logic
│   ├── src/
│   │   ├── calculator/     # Safe range, stop placement algorithms
│   │   ├── types/          # Shared domain types
│   │   ├── url-builder/    # Google Maps URL generation
│   │   ├── utils/          # Haversine distance calculation
│   │   └── validators/     # Input validation
│   └── tests/unit/         # Unit tests (100% coverage)
│
├── apps/web/               # Vue 3 + Vite frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Vue composables
│   │   ├── stores/         # Pinia stores (location, etc.)
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── services/       # API client
│   │   └── App.vue         # Main application
│   └── tests/e2e/          # Playwright E2E tests
│
├── workers/api/            # Cloudflare Worker API
│   ├── src/
│   │   ├── cache/          # KV caching logic
│   │   ├── handlers/       # Route handlers
│   │   └── providers/      # OSRM integration
│   └── tests/integration/  # Integration tests
│
└── specs/                       # Feature documentation
    ├── 001-smart-ev-overlay/    # Initial EV overlay feature
    ├── 002-rate-limiting/       # API rate limiting
    └── 003-geolocation-map-defaults/  # Geolocation & map defaults
```

## Architecture

### Separation of Concerns

| Package         | Responsibility       | Constraints                    |
| --------------- | -------------------- | ------------------------------ |
| `packages/core` | Pure business logic  | Zero browser/Node dependencies |
| `apps/web`      | UI and map rendering | No direct provider calls       |
| `workers/api`   | Edge API and caching | Secrets server-side only       |

### Data Flow

```
User Input → Validation → Safe Range Calculation → Route Fetch →
Stop Placement → Segment Classification → Map Visualization →
Google Maps Handoff
```

## Safe Range Calculation

The core formula for calculating safe driving range:

```
safeRangeKm = ((socNow - reserveArrival) / 100) * (range100Km / factor)
```

Where:

- `socNow`: Current state of charge (0-100%)
- `reserveArrival`: Minimum charge on arrival (default 20%)
- `range100Km`: Vehicle range at 100% charge
- `factor`: Driving efficiency factor (Eco=1.05, Normal=1.15, Highway=1.25)

### Stop Placement Algorithm

1. Calculate safe range with buffer (safeRange - 10km)
2. Accumulate route distance from origin
3. When accumulated >= threshold, place stop
4. Assume 80% charge after each stop
5. Repeat until destination reached
6. Maximum 5 stops

## API Reference

### GET /api/route

Fetch route data with caching.

**Query Parameters:**

- `origin`: Origin coordinates as `lat,lng`
- `destination`: Destination coordinates as `lat,lng`

**Response:**

```json
{
  "route": {
    "origin": { "lat": 37.7749, "lng": -122.4194 },
    "destination": { "lat": 34.0522, "lng": -118.2437 },
    "distanceKm": 612.5,
    "durationMin": 350,
    "geometry": {
      "type": "LineString",
      "coordinates": [[lng, lat], ...]
    }
  }
}
```

## Configuration

### Environment Variables

**apps/web (.env.local):**

```
VITE_API_URL=http://localhost:8787/api
```

**workers/api (.env):**

```
OSRM_BASE_URL=https://router.project-osrm.org
```

### KV Namespace

Create a KV namespace in Cloudflare:

```bash
wrangler kv:namespace create "ROUTE_CACHE"
```

Update `wrangler.toml` with the namespace ID.

## Deployment

### Quick Deploy (One Command)

```bash
# Linux/Mac
./deploy.sh

# Windows
deploy.bat
```

### Manual Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step guide and GitHub Actions setup.

### GitHub Actions (Tag-based Deployment)

Deployments are triggered automatically when a version tag is pushed to `main`.

**Release Workflow:**

```bash
# 1. Create a release branch
git checkout -b release/v1.3.0

# 2. Bump version and sync to all packages
npm version 1.3.0 --no-git-tag-version
pnpm version:sync

# 3. Commit version changes
git add -A
git commit -m "chore(release): v1.3.0"

# 4. Push and create PR
git push -u origin release/v1.3.0
gh pr create --title "chore(release): v1.3.0" --body "Version bump"

# 5. After PR is merged, create and push tag
git checkout main
git pull
git tag v1.3.0
git push --tags
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed version management documentation.

## Testing Strategy

### Unit Tests (packages/core)

- Safe range calculation
- Stop placement algorithm
- Segment classification
- Distance accumulation
- Input validation
- Google Maps URL builder

**Coverage: 100%**

### Integration Tests (workers/api)

- Route endpoint
- KV cache hit/miss
- OSRM normalization
- Error handling

### E2E Tests (apps/web)

- Complete user flow
- **Geolocation flows** (permission grant/deny, auto-populate, map recenter)
- Mobile viewport
- Error states
- Google Maps handoff

## Constitution Compliance

This project follows the [Smart EV Overlay Constitution](.specify/memory/constitution.md):

1. ✅ **Cloudflare-First**: All infrastructure on Cloudflare
2. ✅ **Conservative Safety-First**: 20% reserve, 10km buffer defaults
3. ✅ **Deterministic Core**: Pure functions, no ML
4. ✅ **Security & Privacy**: Input validation, no PII
5. ✅ **Separation of Concerns**: core/web/api packages
6. ✅ **Reliability**: Timeouts, retries, caching
7. ✅ **Definition of Done**: Tests, error states
8. ✅ **Phase-Gated**: MVP Phase 1 complete
9. ✅ **Playwright Testing**: E2E tests for critical paths
10. ✅ **Code Quality**: ESLint/Prettier, strict TS
11. ✅ **Code Security**: No secrets, dependency scanning
12. ✅ **PR Workflow**: Husky pre-commit hooks enforce branch protection

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Quick summary:

1. **Direct commits to `main` are blocked** - use Pull Requests
2. Husky pre-commit hook runs tests automatically
3. Follow the Constitution principles
4. Write tests for new features
5. Follow existing code style

## License

MIT
