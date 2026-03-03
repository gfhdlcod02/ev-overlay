# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

## Future Releases

### [1.1.0] - Planned

- Real charger POI integration
- Elevation impact on range
- Traffic-based routing

### [1.2.0] - Planned

- User accounts and saved trips
- Trip history
- Vehicle profiles

### [2.0.0] - Planned

- Real-time telemetry integration
- OBD-II support
- Mobile app (native)

---

## Deployment Links

- **Production**: [https://fc6ea9ab.ev-overlay.pages.dev](https://fc6ea9ab.ev-overlay.pages.dev)
- **API Worker**: [https://ev-overlay-api.gfhdlcod02.workers.dev](https://ev-overlay-api.gfhdlcod02.workers.dev)
