# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] - 2026-03-03

### Added

- Automated version management system
  - `pnpm version:sync` - Syncs root version to all workspace packages
  - `pnpm version:inject` - Injects version into built files
  - Version display in Web UI (bottom left corner)
  - API version endpoint (`GET /api/version`)
  - `version.json` file in web dist for runtime checks
- Geolocation-based map defaults
  - Auto-detect user location for origin field
  - Thailand default view (Bangkok) when permission denied
  - Smooth flyTo animation to user location
  - Session persistence with sessionStorage
- Rate limiting (60 requests/minute per IP)
- Husky pre-commit hooks to enforce PR workflow

## [1.1.0] - 2026-03-02

### Added

- iOS geolocation coordinate formatting fix
- API error handling improvements
- E2E tests for geolocation flows and API errors

## [1.0.0] - 2026-03-01

### Added

- Initial MVP release
- Trip planning with origin/destination input
- EV parameter configuration (SoC, range, reserve, driving factor)
- Safe range calculation with conservative defaults (20% reserve, 10km buffer)
- Route visualization with safe (green) and risky (red) segments
- Virtual charging stop placement along route
- Google Maps handoff with waypoint generation
- Cloudflare Worker API with OSRM integration
- KV caching with 7-day TTL
- Responsive design for mobile and desktop
- WCAG 2.1 AA accessibility compliance
- Comprehensive test suite (85 unit + 10 integration + 38 E2E tests)

### Technical

- Vue 3 + Vite frontend
- TypeScript strict mode throughout
- pnpm workspaces for monorepo management
- ESLint + Prettier code quality tools
- Playwright for E2E testing
- Vitest for unit testing
- Automated version management with sync/inject scripts

---

## Deployment Links

- **Production**: [https://fc6ea9ab.ev-overlay.pages.dev](https://fc6ea9ab.ev-overlay.pages.dev)
- **API Worker**: [https://ev-overlay-api.gfhdlcod02.workers.dev](https://ev-overlay-api.gfhdlcod02.workers.dev)

---

## Version Management

This project uses automated version management:

1. Update version in root `package.json` using `pnpm version x.x.x`
2. Script automatically syncs to all workspace packages
3. CI/CD injects version into built artifacts
4. Version is displayed in UI and available via API

See [DEPLOYMENT.md](DEPLOYMENT.md) for details.
