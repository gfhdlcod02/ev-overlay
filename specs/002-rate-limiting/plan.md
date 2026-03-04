# Implementation Plan: API Rate Limiting

**Branch**: `002-rate-limiting` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-rate-limiting/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add basic rate limiting to the existing Cloudflare Worker API to comply with Constitution IV security requirements. Implement 60 requests/minute per IP using KV storage with a sliding window algorithm, proper rate limit headers, and graceful failure handling.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.3
**Primary Dependencies**: Cloudflare Workers runtime (existing)
**Storage**: Cloudflare KV (existing ROUTE_CACHE namespace)
**Testing**: Vitest (existing test framework)
**Target Platform**: Cloudflare Workers (edge)
**Project Type**: web-service (API enhancement)
**Performance Goals**: Rate limit check <10ms overhead per request
**Constraints**: Must fail open (allow requests) if KV unavailable
**Scale/Scope**: Single endpoint (/api/route), 60 req/min per IP

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Status  | Notes                                                                                  |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| I. Cloudflare-First              | ✅ PASS | Uses existing Cloudflare Workers + KV infrastructure                                   |
| II. Conservative Safety-First UX | N/A     | Backend feature, no user-facing safety implications                                    |
| III. Deterministic Core Logic    | ✅ PASS | Rate limit calculations are deterministic                                              |
| IV. Security & Privacy           | ✅ PASS | **Directly addresses Constitution IV requirement for "Basic rate limiting at Worker"** |
| V. Separation of Concerns        | ✅ PASS | Rate limiting isolated in Worker layer, no core changes                                |
| VI. Reliability & Performance    | ✅ PASS | Fail-open design ensures availability; <10ms overhead target                           |
| VII. Definition of Done          | ✅ PASS | Includes tests for rate limiting behavior                                              |
| VIII. Phase-Gated Delivery       | ✅ PASS | Small, focused enhancement to existing MVP                                             |
| IX. Playwright Web Testing       | N/A     | Backend API feature, E2E tests cover via API calls                                     |
| X. Code Quality Standards        | ✅ PASS | Follows existing ESLint/Prettier, TypeScript strict mode                               |
| XI. Code Security Standards      | ✅ PASS | Implements security requirement from Constitution                                      |

**No constitution violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
workers/api/           # Existing Cloudflare Worker
├── src/
│   ├── handlers/
│   │   ├── route.ts          # Existing - add rate limit check
│   │   ├── rate-limit.ts     # NEW - rate limiting logic
│   │   └── cors.ts           # Existing
│   ├── providers/            # Existing
│   ├── cache/                # Existing
│   └── index.ts              # Existing - integrate rate limiting
└── tests/
    └── integration/
        └── rate-limit.test.ts    # NEW - rate limit integration tests
```

**Structure Decision**: Enhance existing `workers/api` structure. Rate limiting is implemented as a new handler module (`rate-limit.ts`) integrated into the request flow in `index.ts`. No changes to `packages/core` or `apps/web` required.

## Complexity Tracking

> **No constitution violations requiring justification**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |

---

## Phase 0: Research & Outline

### Research Completed

Rate limiting is a well-understood domain. For Cloudflare Workers with KV storage, the standard approach is:

**Key Decisions:**

1. **Algorithm**: True sliding window using per-client KV entries with TTL
2. **Storage**: Reuse existing ROUTE_CACHE KV namespace (separate key prefix)
3. **Client Identification**: `CF-Connecting-IP` header (Cloudflare-provided)
4. **Headers**: Follow industry standard (GitHub, Twitter API patterns)
5. **Error Format**: Consistent with existing API error format

### Design Decisions

| Decision                      | Choice                                     | Rationale                                 |
| ----------------------------- | ------------------------------------------ | ----------------------------------------- |
| Sliding window implementation | Per-client KV entry with timestamp + count | Simple, accurate, uses existing KV        |
| Key format                    | `rate_limit:{ip}`                          | Clear prefix, easy to query/debug         |
| TTL strategy                  | 60 seconds (window duration)               | Automatic cleanup, prevents key buildup   |
| Fail-open behavior            | Log error, allow request                   | Constitution VI - reliability prioritized |
| Headers                       | X-RateLimit-\* family                      | Industry standard, widely understood      |

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for entity definitions.

**Core Entities:**

- `RateLimitEntry`: Client request tracking (count, windowStart)
- `RateLimitResult`: Check result (allowed, remaining, resetTime)
- `RateLimitError`: 429 error response format

### Interface Contracts

See [contracts/](./contracts/) directory:

- `rate-limit.md`: Rate limiting behavior specification

### Quickstart

See [quickstart.md](./quickstart.md) for testing rate limiting locally.

## Implementation Notes

### Critical Implementation Requirements

1. **Sliding Window Logic**: Each request checks KV for existing entry. If expired or missing, start new window. Otherwise increment count and check against limit.

2. **Header Consistency**: All responses (200, 429, errors) MUST include rate limit headers.

3. **Error Handling**: KV failures MUST NOT block legitimate requests. Log error, set generous headers, allow request.

4. **IPv6 Handling**: `CF-Connecting-IP` may return IPv6 addresses. Use as-is for key (KV handles colons in keys).

## Next Steps

1. Run `/speckit.tasks` to generate the actionable task list
2. Implement rate limiting handler
3. Add integration tests
4. Deploy to staging and verify
