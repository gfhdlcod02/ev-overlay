# Contract: Rate Limiting API

## Endpoint Behavior

All requests to `/api/route` are subject to rate limiting.

### Rate Limit Rules

- **Limit**: 60 requests per minute per IP
- **Window**: 60-second sliding window
- **Client ID**: `CF-Connecting-IP` header

### Request Handling

#### Within Limit

```http
GET /api/route?origin=...&destination=...
```

**Response Headers (200 OK):**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1709312400
```

#### Rate Limit Exceeded

```http
GET /api/route?origin=...&destination=...
```

**Response (429 Too Many Requests):**

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709312400
Retry-After: 45

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "retryAfter": 45
  }
}
```

### Header Specifications

| Header                  | Present On         | Description                                 |
| ----------------------- | ------------------ | ------------------------------------------- |
| `X-RateLimit-Limit`     | All responses      | Maximum requests allowed per window (60)    |
| `X-RateLimit-Remaining` | All responses      | Remaining requests in current window        |
| `X-RateLimit-Reset`     | All responses      | Unix timestamp (seconds) when window resets |
| `Retry-After`           | 429 responses only | Seconds until client can retry              |

### Error Codes

| Code                  | Status | Description                            |
| --------------------- | ------ | -------------------------------------- |
| `RATE_LIMIT_EXCEEDED` | 429    | Client has exceeded 60 requests/minute |

### Client Responsibilities

1. Check `X-RateLimit-Remaining` before making requests
2. Handle 429 responses gracefully with exponential backoff
3. Respect `Retry-After` header when present
4. Cache responses when appropriate to reduce API calls
