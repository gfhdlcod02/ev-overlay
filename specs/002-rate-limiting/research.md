# Research: API Rate Limiting

**Date**: 2026-03-01

## Research Questions

1. What rate limiting algorithms work best with Cloudflare Workers + KV?
2. What are industry-standard rate limit headers?
3. How to handle KV failures gracefully?

## Findings

### Rate Limiting Algorithms

| Algorithm      | Pros                | Cons                            | Suitable for KV? |
| -------------- | ------------------- | ------------------------------- | ---------------- |
| Fixed Window   | Simple, low storage | Boundary burst problem          | ✅ Yes           |
| Sliding Window | Smooth, no bursts   | More complex, higher storage    | ✅ Yes           |
| Token Bucket   | Allows bursts       | Harder to implement distributed | ⚠️ Complex       |
| Leaky Bucket   | Smooths traffic     | Requires queuing                | ❌ No            |

**Decision**: Use sliding window with per-client KV entries. Each entry stores count + window start timestamp.

### Industry Standard Headers

Based on GitHub API, Twitter API, and Stripe API:

- `X-RateLimit-Limit`: Maximum requests allowed (60)
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds until retry (only on 429 responses)

### KV Storage Strategy

```typescript
// Key format
const key = `rate_limit:${clientIP}`

// Value structure
interface RateLimitEntry {
  count: number // Request count in window
  windowStart: number // Timestamp (ms) when window started
}
```

**TTL**: 60 seconds (matches window duration). This ensures automatic cleanup.

### Client IP Identification

Cloudflare Workers provide `CF-Connecting-IP` header which contains the original client IP.

- Handles NAT/proxies automatically
- IPv4 and IPv6 supported
- Cannot be spoofed by client (Cloudflare sets this)

### Failure Modes

| Scenario       | Behavior                 | Rationale                   |
| -------------- | ------------------------ | --------------------------- |
| KV read fails  | Allow request, log error | Fail open for availability  |
| KV write fails | Allow request, log error | Fail open for availability  |
| Clock skew     | Use server time only     | Prevent client manipulation |

## References

- Cloudflare Workers KV docs: https://developers.cloudflare.com/workers/runtime-apis/kv/
- GitHub API Rate Limiting: https://docs.github.com/en/rest/overview/rate-limits
- RFC 6585 (HTTP Status 429): https://tools.ietf.org/html/rfc6585
