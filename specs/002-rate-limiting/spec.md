# Feature Specification: API Rate Limiting

**Feature Branch**: `002-rate-limiting`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "with refinement for rate limiting"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prevent API Abuse (Priority: P1)

As an API operator, I want to limit the number of requests per client so that the service remains available for all users and prevents abuse from excessive requests.

**Why this priority**: Rate limiting is a core security requirement mandated by Constitution IV. Without it, the API is vulnerable to abuse and potential denial of service attacks.

**Independent Test**: Can be fully tested by making multiple requests from the same IP and verifying that requests beyond the limit are rejected with a 429 status code.

**Acceptance Scenarios**:

1. **Given** a client makes requests within the allowed rate limit, **When** the request count is under the threshold, **Then** all requests are processed normally with rate limit headers indicating remaining quota.

2. **Given** a client exceeds the rate limit threshold, **When** a request is made beyond the allowed quota, **Then** the request is rejected with HTTP 429 status and includes a Retry-After header indicating when requests can resume.

3. **Given** a client has been rate limited, **When** the rate limit window resets after the time period, **Then** the client's quota is restored and requests are processed normally again.

---

### User Story 2 - Graceful Rate Limit Recovery (Priority: P2)

As an API consumer, I want clear feedback when I hit rate limits so that I can adjust my request patterns and understand when I can make requests again.

**Why this priority**: Clear error messages improve developer experience and help legitimate users understand and work within rate limits.

**Independent Test**: Can be fully tested by exceeding the rate limit and verifying the response includes clear error messaging and timing information.

**Acceptance Scenarios**:

1. **Given** a request is rejected due to rate limiting, **When** the 429 response is returned, **Then** the response body includes a clear error message explaining the rate limit was exceeded.

2. **Given** a rate limited response is returned, **When** examining the response headers, **Then** X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers are present.

---

### Edge Cases

- **KV storage failure**: When rate limit tracking via KV fails, the system MUST fail open (allow requests) to maintain availability, logging the error for monitoring.

- **Clock skew**: Rate limit windows MUST use server-side time to prevent client clock manipulation.

- **Shared IPs**: Requests from shared IP addresses (NAT, proxies) are treated as a single client; this is acceptable for basic rate limiting.

- **Strict enforcement**: All requests exceeding the 60/min limit are rejected with HTTP 429; no burst allowance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce a rate limit of 60 requests per minute per client IP address on the `/api/route` endpoint.

- **FR-002**: System MUST track request counts using KV storage with a 1-minute sliding window.

- **FR-003**: System MUST return HTTP 429 (Too Many Requests) with error body `{ error: { code: "RATE_LIMIT_EXCEEDED", message, retryAfter } }` when the rate limit is exceeded.

- **FR-004**: System MUST include rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) in all API responses.

- **FR-005**: System MUST include a `Retry-After` header (in seconds) in 429 responses indicating when the client can retry.

- **FR-006**: System MUST fail open (allow request) if the rate limiting mechanism itself fails (e.g., KV unavailable), logging the error for monitoring.

- **FR-007**: System MUST identify clients by their IP address using the `CF-Connecting-IP` header.

### Key Entities *(include if feature involves data)*

- **RateLimitEntry**: Tracks request count and window start time for a client. Attributes: count (number of requests), windowStart (timestamp).

- **RateLimitHeaders**: Standard headers for rate limit communication. Attributes: X-RateLimit-Limit (max requests), X-RateLimit-Remaining (remaining quota), X-RateLimit-Reset (reset timestamp).

## Clarifications

### Session 2026-03-01

- **Q**: What algorithm should be used for the 1-minute rate limiting window? → **A**: True sliding window - count requests in rolling 60-second period (more accurate, prevents edge attacks)

- **Q**: What should the JSON error response body contain for 429 errors? → **A**: Match existing API error format with rate limit details: `{ error: { code: "RATE_LIMIT_EXCEEDED", message: "...", retryAfter: 45 } }`

- **Q**: Should the system strictly reject all requests over the limit, or allow short bursts? → **A**: Strict enforcement - reject all requests over 60/min with 429

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: API rejects requests exceeding 60 requests per minute with HTTP 429 status code.

- **SC-002**: 100% of API responses include rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

- **SC-003**: All 429 responses include a valid `Retry-After` header with seconds until reset.

- **SC-004**: Rate limiting mechanism fails open (does not block legitimate traffic) if KV storage is unavailable.

- **SC-005**: Rate limit windows correctly reset after 60 seconds, restoring full quota to clients.
