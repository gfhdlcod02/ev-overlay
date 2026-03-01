# ev-overlay Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-01

## Active Technologies
- Cloudflare KV (route caching, 7-day TTL) (001-smart-ev-overlay)
- TypeScript 5.3 + Cloudflare Workers runtime (existing) (002-rate-limiting)
- Cloudflare KV (existing ROUTE_CACHE namespace) (002-rate-limiting)

- TypeScript 5.3, Node 20+ (001-smart-ev-overlay)

## Project Structure

```text
packages/core/     # Pure deterministic TS logic
apps/web/          # Vue 3 + Vite frontend
workers/api/       # Cloudflare Worker API
specs/001-smart-ev-overlay/  # Feature documentation
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.3, Node 20+: Follow standard conventions

## Recent Changes
- 002-rate-limiting: Added TypeScript 5.3 + Cloudflare Workers runtime (existing)
- 002-rate-limiting: Added API rate limiting (60 req/min per IP)
- 001-smart-ev-overlay: Added Cloudflare KV for route caching

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
