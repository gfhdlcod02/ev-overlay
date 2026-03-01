# Data Model: API Rate Limiting

## Entities

### RateLimitEntry

Stores request count and window timing for a client.

```typescript
interface RateLimitEntry {
  /** Number of requests in current window */
  count: number

  /** Timestamp (ms) when window started */
  windowStart: number
}
```

**Key format**: `rate_limit:{ip}` (e.g., `rate_limit:192.168.1.1`)

**TTL**: 60 seconds

**Storage**: Cloudflare KV

---

### RateLimitResult

Result of a rate limit check.

```typescript
interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean

  /** Remaining requests in window */
  remaining: number

  /** Unix timestamp (seconds) when window resets */
  resetTime: number
}
```

---

### RateLimitHeaders

HTTP headers added to all API responses.

```typescript
interface RateLimitHeaders {
  /** Maximum requests per window (60) */
  'X-RateLimit-Limit': string

  /** Remaining requests in current window */
  'X-RateLimit-Remaining': string

  /** Unix timestamp when window resets */
  'X-RateLimit-Reset': string

  /** Seconds until retry (429 responses only) */
  'Retry-After'?: string
}
```

---

### RateLimitError

Error response body for 429 responses.

```typescript
interface RateLimitError {
  error: {
    /** Error code */
    code: 'RATE_LIMIT_EXCEEDED'

    /** Human-readable message */
    message: string

    /** Seconds until client can retry */
    retryAfter: number
  }
}
```

## State Transitions

```
No Entry in KV
       |
       v
+------------------+
|  Create Entry    |  count=1, windowStart=now
|  allowed=true    |
+------------------+
       |
       v
+--------------------------------+
|         Within Window?         |
|  (now - windowStart <= 60s)    |
+--------------------------------+
       |                 |
      YES               NO
       |                 |
       v                 v
+-------------+   +------------------+
| Check Count |   |  Reset Entry     |
|  vs Limit   |   |  count=1         |
+-------------+   |  windowStart=now |
       |          +------------------+
       |                 |
      <=60              >60
       |                 |
       v                 v
+-------------+   +------------------+
| Increment   |   |  Reject (429)    |
| allowed=true|   |  allowed=false   |
+-------------+   +------------------+
```

## Constraints

- **Max requests**: 60 per window
- **Window duration**: 60 seconds
- **Key max size**: 512 bytes (IP + prefix well within limit)
- **Value max size**: 25 MB (entry is ~50 bytes)
