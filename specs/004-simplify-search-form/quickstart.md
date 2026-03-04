# Quickstart: Simplify Search Form

**Feature**: Simplify Search Form
**Branch**: `004-simplify-search-form`
**Date**: 2026-03-04

---

## Prerequisites

- Node.js 20+
- pnpm 8+
- Git

---

## Development Setup

### 1. Clone and checkout branch

```bash
git checkout 004-simplify-search-form
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start development servers

```bash
# Start all services (web + api worker)
pnpm dev:all

# Or start individually:
pnpm dev:web      # Vue dev server (http://localhost:5173)
pnpm dev:api      # Worker dev server (http://localhost:8787)
```

---

## Manual Testing Checklist

### Plain Text Inputs (FR-001, FR-002, FR-003)

- [ ] Open trip planning form
- [ ] Type in Origin field - **no autocomplete dropdown appears**
- [ ] Type in Destination field - **no autocomplete dropdown appears**
- [ ] Open browser DevTools Network tab - **zero API calls while typing**
- [ ] Verify inputs accept any text without interference

### Explicit Search Trigger (FR-004)

- [ ] Fill in Origin and Destination
- [ ] Click "Plan Trip" button - **search API is called**
- [ ] Fill new values, press Enter in form - **search API is called**
- [ ] Verify no search happens without explicit action

### Request Deduplication (FR-005)

- [ ] Open DevTools Network tab
- [ ] Click "Plan Trip" rapidly 5 times
- [ ] **Only 1 API request** should appear in Network tab
- [ ] All clicks should resolve with the same result

### Caching (FR-006)

- [ ] Search for "Bangkok to Chiang Mai"
- [ ] Wait for result
- [ ] Click "Plan Trip" again within 60 seconds
- [ ] **No new API request** - result appears instantly from cache
- [ ] Wait 60+ seconds, search again - **new API request made**

### Request Cancellation (FR-007)

- [ ] Start a search
- [ ] Before it completes, modify Origin and search again
- [ ] Previous request should be cancelled (no error shown)
- [ ] New request completes successfully

### Error Handling (FR-011)

- [ ] Enter invalid Origin (e.g., "xyz123notarealplace")
- [ ] Click "Plan Trip"
- [ ] **Inline error message** displayed in form
- [ ] User can correct and retry

### Preserved UX (FR-008, FR-009)

- [ ] Leave Origin empty - validation error shown
- [ ] Enter negative EV range - validation error shown
- [ ] Grant location permission - Origin auto-populates with coordinates
- [ ] All existing validation rules still work

---

## Running Tests

### Unit Tests

```bash
# Test new cache/dedup utilities
pnpm test apps/web/src/services/request-cache.test.ts

# Test modified api-client
pnpm test apps/web/src/services/api-client.test.ts

# Run all unit tests
pnpm test
```

### E2E Tests

```bash
# Run Playwright tests for this feature
pnpm test:e2e specs/trip-planning.spec.ts

# Run all E2E tests
pnpm test:e2e
```

---

## Key Files to Review

| File                                           | Purpose                                           |
| ---------------------------------------------- | ------------------------------------------------- |
| `apps/web/src/services/request-cache.ts`       | **NEW**: LRU cache with TTL implementation        |
| `apps/web/src/services/api-client.ts`          | **MODIFIED**: Added dedup, cache, cancellation    |
| `apps/web/src/composables/useRoutePlanning.ts` | **MODIFIED**: Integrates new API client features  |
| `apps/web/src/components/TripInputForm.vue`    | **VERIFIED**: Plain text inputs (no autocomplete) |

---

## Debugging

### Check Cache State

In browser DevTools Console:

```javascript
// Access cache via global (if exposed for debugging)
window.__SEARCH_CACHE__.size()
window.__SEARCH_CACHE__.clear()
```

### View Pending Requests

```javascript
// Check deduplicator state
window.__PENDING_REQUESTS__
```

### Enable Verbose Logging

Add to `apps/web/src/services/api-client.ts`:

```typescript
const DEBUG = true
if (DEBUG) console.log('[API Client]', ...)
```

---

## Common Issues

### Issue: Cache not hitting

**Cause**: Cache key normalization mismatch
**Fix**: Verify origin/destination normalization (case, whitespace)

### Issue: Requests not deduplicating

**Cause**: Different cache keys for same search
**Fix**: Check that normalization is applied consistently

### Issue: Cancelled requests show error

**Cause**: AbortError not being caught/handled
**Fix**: Ensure AbortError is filtered from error display

---

## Performance Benchmarks

| Metric             | Target              | How to Measure           |
| ------------------ | ------------------- | ------------------------ |
| Cache hit response | <50ms               | DevTools Performance tab |
| Dedup window       | 5s                  | Rapid click test         |
| Cache TTL          | 60s                 | Wait and retry test      |
| Memory usage       | <5MB for 50 entries | Chrome Memory profiler   |
