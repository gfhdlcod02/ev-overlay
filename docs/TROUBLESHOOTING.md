# Troubleshooting Guide

## Service Error: "API returned HTML instead of JSON"

### Problem
When clicking "Plan Trip", you see an error:
```
Service Error
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### Root Cause
The frontend expects JSON from the API, but received an HTML error page instead. This happens when:

1. **API Worker is not running** - The Vite dev server proxies `/api` requests to `http://127.0.0.1:8787`, but if the Cloudflare Worker dev server isn't running, you get the Vite HTML fallback page.

2. **Wrong API URL** - The `VITE_API_URL` environment variable might point to a wrong/non-existent URL.

### Solution

#### Option 1: Start both servers
```bash
# Start both API and Web servers
pnpm dev:all
```

Or manually in two terminals:
```bash
# Terminal 1 - API Worker
pnpm --filter @ev/api dev

# Terminal 2 - Web App
pnpm --filter @ev/web dev
```

#### Option 2: Update environment variables
If running only the web app with mocked API:

1. Create `apps/web/.env.local`:
```
VITE_API_URL=http://localhost:3000/mock-api
```

2. Or use the existing mock API in tests (see `trip-planning.spec.ts` for examples).

### Testing

Run the error handling tests:
```bash
pnpm test:e2e -- api-error-handling.spec.ts
```

This tests various error scenarios:
- API returning HTML error page (404)
- API unreachable (connection refused)
- API returning 500 Internal Server Error
- API rate limiting (429)

---

## Server Error: "The string did not match expected pattern" (iOS)

### Problem
On iOS devices (iPhone/iPad), when geolocation is available and you click "Plan Trip", you see:
```
Server Error
The string did not match expected pattern.
```

### Root Cause
iOS Safari may use locale-specific number formatting where `toFixed()` produces commas instead of dots as decimal separators (e.g., `13,756300` instead of `13.756300`).

This creates invalid coordinate strings like `13,756300,100,501800` which `URLSearchParams` cannot parse correctly.

### Solution

This issue has been fixed in the codebase. The fix uses `formatCoordinate()` and `formatCoordinatePair()` utility functions that:
1. Use `toFixed()` for precision
2. Replace any commas with dots to ensure consistent formatting
3. Guarantee the coordinate format is always `lat,lng` with dots as decimal separators

**Key files changed:**
- `apps/web/src/utils/coordinates.ts` - Added `formatCoordinate()` and `formatCoordinatePair()`
- `apps/web/src/components/TripInputForm.vue` - Uses `formatCoordinatePair()` for geolocation

### Testing

Run the iOS geolocation tests:
```bash
pnpm test:e2e -- ios-geolocation.spec.ts
```

To manually test on iOS:
1. Open Safari on iPhone/iPad
2. Go to the app URL
3. Allow location access when prompted
4. Verify origin is auto-populated with coordinates using dots (e.g., `13.756300,100.501800`)
5. Enter a destination
6. Click "Plan Trip" - should work without error

---

### Architecture

```
┌─────────────┐      Proxy /api      ┌─────────────────┐
│   Web App   │ ───────────────────> │  API Worker     │
│  (Vue 3)    │  http://localhost:8787  │ (Cloudflare)    │
│  Port 3000  │                      │  Port 8787      │
└─────────────┘                      └─────────────────┘
```

The Vite dev server config (`apps/web/vite.config.ts`) contains:
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
  }
}
```

If the target is unavailable, requests return the Vite HTML fallback instead of JSON.
