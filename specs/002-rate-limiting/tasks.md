# Tasks: API Rate Limiting

**Feature**: 002-rate-limiting
**Branch**: `002-rate-limiting`
**Date**: 2026-03-01

## Summary

This task list implements basic rate limiting (60 req/min per IP) for the existing Cloudflare Worker API. The implementation uses KV storage with a sliding window algorithm and includes proper rate limit headers.

**Total Tasks**: 12
**User Stories**: 2 (P1: Prevent API Abuse, P2: Graceful Rate Limit Recovery)
**Estimated Parallel Groups**: 3

---

## Dependency Graph

```
Phase 3: US1 - Prevent API Abuse (P1)
    │
    ├───▶ Phase 4: US2 - Graceful Rate Limit Recovery (P2)
    │         │ (depends on rate limit logic from US1)
    │         ▼
    └───▶ Phase 5: Tests & Polish
              │ (depends on both US1 and US2)
              ▼
         Complete
```

---

## Phase 3: US1 - Prevent API Abuse (Priority: P1) 🎯 MVP

**Goal**: Implement core rate limiting logic with sliding window algorithm in the Worker.

**Independent Test**: Can be tested by making 61 rapid requests and verifying the 61st returns HTTP 429.

### Implementation for User Story 1

- [x] T001 [P] [US1] Create `workers/api/src/handlers/rate-limit.ts` with `RateLimitEntry` interface and rate limiting constants (60 req/min, 60s window)

- [x] T002 [P] [US1] Create `workers/api/src/handlers/rate-limit.ts` with `checkRateLimit()` function implementing sliding window logic using KV storage

- [x] T003 [US1] Create `workers/api/src/handlers/rate-limit.ts` with helper function `getRateLimitHeaders()` to generate X-RateLimit-* headers

- [x] T004 [US1] Integrate rate limiting into `workers/api/src/index.ts` - call `checkRateLimit()` before route handler, pass KV namespace

- [x] T005 [US1] Update `workers/api/src/handlers/route.ts` to accept and return rate limit headers in responses

**Checkpoint**: Rate limiting should reject requests over 60/min with 429 status

---

## Phase 4: US2 - Graceful Rate Limit Recovery (Priority: P2)

**Goal**: Add clear error messages and proper headers for rate limited responses.

**Independent Test**: Can be tested by verifying 429 responses include error body with `retryAfter` field and all rate limit headers.

### Implementation for User Story 2

- [x] T006 [P] [US2] Create rate limit error response format in `workers/api/src/handlers/rate-limit.ts` - `createRateLimitError()` function returning `{ error: { code: "RATE_LIMIT_EXCEEDED", message, retryAfter } }`

- [x] T007 [US2] Add `Retry-After` header to 429 responses in `workers/api/src/handlers/rate-limit.ts` - calculate seconds until window reset

- [x] T008 [US2] Update `workers/api/src/index.ts` to return proper 429 response with error body and headers when rate limit exceeded

- [x] T009 [US2] Ensure all responses (200, 429, errors) include rate limit headers by updating response wrapper in `workers/api/src/index.ts`

**Checkpoint**: All API responses include rate limit headers; 429 responses include clear error message and retry timing

---

## Phase 5: Tests & Polish

**Goal**: Add integration tests and verify edge cases (KV failure, window reset).

**Independent Test**: All integration tests pass, including edge cases for KV failures and window resets.

### Tests

- [x] T010 Create `workers/api/tests/integration/rate-limit.test.ts` with tests for: allowing requests under limit, rejecting at limit (429), and window reset after 60s

- [x] T011 Create `workers/api/tests/integration/rate-limit.test.ts` with tests for: KV failure fail-open behavior, and header presence in all responses

### Polish

- [x] T012 Run tests with `pnpm --filter @ev/api test` and verify all pass; update `CLAUDE.md` with rate limiting status

---

## Parallel Execution Examples

### Parallel Group 1: Core Rate Limit Logic (T001-T003)

```bash
# All can be developed in parallel as they build the same file
T001: RateLimitEntry interface and constants
T002: checkRateLimit() sliding window function
T003: getRateLimitHeaders() helper
```

### Parallel Group 2: Integration Points (T004-T005)

```bash
# After T001-T003 complete:
T004: Integrate into index.ts
T005: Update route.ts for headers
```

### Parallel Group 3: Error Handling (T006-T009)

```bash
# After core logic complete:
T006: Error response format
T007: Retry-After header
T008: 429 response in index.ts
T009: Ensure headers on all responses
```

---

## Success Criteria Mapping

| Success Criterion | Validating Tasks |
|-------------------|------------------|
| SC-001: Reject >60 req/min with 429 | T002, T004, T010 |
| SC-002: All responses include rate limit headers | T003, T005, T009, T011 |
| SC-003: 429 responses include Retry-After | T007, T008, T010 |
| SC-004: Fail open on KV failure | T002 (fail-open logic), T011 |
| SC-005: Window resets after 60s | T002 (TTL logic), T010 |

---

## File Path Summary

**workers/api/src/**:
- `handlers/rate-limit.ts` (T001-T003, T006-T007)
- `handlers/route.ts` (T005)
- `handlers/cors.ts` (T009 - if needed)
- `index.ts` (T004, T008)

**workers/api/tests/integration/**:
- `rate-limit.test.ts` (T010-T011)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T005 (core rate limiting)
2. Test: Make 61 rapid requests, verify 61st is rejected
3. Deploy - MVP complete (constitution compliance achieved)

### Incremental Delivery

1. US1 (T001-T005): Core rate limiting → Deploy → Test
2. US2 (T006-T009): Error messages and headers → Deploy → Test
3. Tests (T010-T012): Full test coverage → Final validation

### Definition of Done per Task

- Code follows existing ESLint/Prettier configuration
- TypeScript compiles without errors
- Unit/integration tests pass
- No secrets logged in rate limit tracking

### Quality Gates

1. **After Phase 3**: Manual test confirms 61st request returns 429
2. **After Phase 4**: All responses include proper headers verified
3. **After Phase 5**: All integration tests pass
