# Quickstart: Testing Rate Limiting

## Local Development

### 1. Start Local Dev Server

```bash
cd workers/api
wrangler dev
```

### 2. Test Rate Limiting

Make 61 requests in quick succession to trigger rate limiting:

```bash
# Bash script to test rate limiting
for i in {1..65}; do
  echo "Request $i:"
  curl -s -w "\nHTTP: %{http_code}\nX-RateLimit-Remaining: %{header_x-ratelimit-remaining}\n\n" \
    "http://localhost:8787/api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437"
  sleep 0.1
done
```

### 3. Verify Headers

Check that rate limit headers are present:

```bash
curl -s -I "http://localhost:8787/api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437"
```

Expected headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1709312400
```

### 4. Test 429 Response

After exceeding limit:

```bash
curl -s "http://localhost:8787/api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437" \
  -w "\nHTTP: %{http_code}\nRetry-After: %{header_retry-after}\n"
```

Expected:

```
HTTP: 429
Retry-After: 45
```

## Running Tests

```bash
# Run rate limiting integration tests
pnpm --filter @ev/api test

# Run all tests
pnpm test
```

## Deployment

```bash
cd workers/api
wrangler deploy
```

Verify on deployed worker:

```bash
curl -s -I "https://ev-overlay-api.gfhdlcod02.workers.dev/api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437"
```
