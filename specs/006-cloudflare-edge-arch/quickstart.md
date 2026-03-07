# Quickstart: Cloudflare Edge-Native Development

**Date**: 2026-03-07

## Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account with access to:
  - Workers
  - D1
  - KV
  - Durable Objects
  - Queues
  - R2
  - Pages

## Initial Setup

### 1. Clone and Install

```bash
git clone <repo>
cd ev-overlay
pnpm install
```

### 2. Cloudflare Authentication

```bash
# Install wrangler globally
pnpm add -g wrangler

# Login to Cloudflare
wrangler login

# Verify access
wrangler whoami
```

### 3. Create Cloudflare Resources

#### D1 Database

```bash
# Create production database
wrangler d1 create ev-overlay-prod

# Note the database ID from output, add to wrangler.toml
```

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ev-overlay-prod"
database_id = "your-database-id"
```

#### KV Namespaces

```bash
# Create namespaces
wrangler kv:namespace create "ROUTE_CACHE"
wrangler kv:namespace create "STATION_CACHE"

# For preview environments
wrangler kv:namespace create "ROUTE_CACHE" --preview
wrangler kv:namespace create "STATION_CACHE" --preview
```

Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "ROUTE_CACHE"
id = "your-route-cache-id"
preview_id = "your-preview-route-cache-id"

[[kv_namespaces]]
binding = "STATION_CACHE"
id = "your-station-cache-id"
preview_id = "your-preview-station-cache-id"
```

#### R2 Bucket

```bash
wrangler r2 bucket create ev-overlay-snapshots
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "SNAPSHOTS"
bucket_name = "ev-overlay-snapshots"
```

#### Queues

```bash
wrangler queues create ingestion-jobs
wrangler queues create ingestion-retries
```

Update `wrangler.toml`:

```toml
[[queues.producers]]
queue = "ingestion-jobs"
binding = "INGESTION_QUEUE"

[[queues.consumers]]
queue = "ingestion-jobs"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "ingestion-retries"
```

### 4. Database Migrations

```bash
# Create local D1 for development
wrangler d1 create ev-overlay-dev

# Apply migrations
cd workers/api
wrangler d1 migrations apply ev-overlay-dev --local

# For production (be careful!)
wrangler d1 migrations apply ev-overlay-prod
```

### 5. Environment Secrets

```bash
# Set secrets for Workers
cd workers/api
wrangler secret put GOOGLE_MAPS_API_KEY
wrangler secret put OPENCHARGEMAP_API_KEY
wrangler secret put RATE_LIMIT_SECRET  # For internal rate limit validation

# Verify secrets
wrangler secret list
```

## Development Workflow

### Running Locally

```bash
# Terminal 1: API Worker with local D1
cd workers/api
wrangler dev --local --persist

# Terminal 2: Web app
cd apps/web
pnpm dev
```

The API will be at `http://localhost:8787` and the web app at `http://localhost:5173`.

### Testing

```bash
# Unit tests (packages/core)
cd packages/core
pnpm test

# Worker integration tests (with Miniflare)
cd workers/api
pnpm test

# E2E tests (requires dev server running)
cd apps/web
pnpm test:e2e
```

### D1 Local Development

```bash
# Open local D1 console
wrangler d1 execute ev-overlay-dev --local --command="SELECT * FROM charging_stations LIMIT 5"

# Dump local data
wrangler d1 export ev-overlay-dev --local --output=./backup.sql
```

## Deployment

### Staging

```bash
# Deploy Worker to staging
wrangler deploy --env staging

# Deploy Pages (web app)
cd apps/web
wrangler pages deploy dist --project-name=ev-overlay-staging
```

### Production

```bash
# Deploy Worker
wrangler deploy --env production

# Deploy Pages
cd apps/web
wrangler pages deploy dist --project-name=ev-overlay
```

## Common Tasks

### Run Manual Ingestion

```bash
# Trigger via Wrangler (invoke DO method)
curl -X POST http://localhost:8787/admin/ingest \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"countryCode": "TH", "modifiedSince": "2024-01-01"}'
```

### Check Queue Status

```bash
# View queue depth
wrangler queues info ingestion-jobs

# Peek at messages (debugging)
wrangler queues peek ingestion-jobs --count=10
```

### Clear KV Cache

```bash
# Delete all keys matching pattern
wrangler kv:bulk delete --namespace-id=your-cache-id --file=./keys-to-delete.json
```

### View Logs

```bash
# Real-time Worker logs
wrangler tail

# Filtered logs
wrangler tail --format=pretty --status=error
```

## Troubleshooting

### D1 "database not found"

Ensure `wrangler.toml` has correct `database_id` and you're using `--local` flag for local development.

### KV eventual consistency delays

In local development, KV is strongly consistent. In production, expect 60s propagation delay.

### Queue message not processing

1. Check queue consumer is configured in `wrangler.toml`
2. Verify Worker has `queue()` handler exported
3. Check logs for handler errors

### Durable Object state lost

DOs persist state automatically. If state seems lost:
1. Check DO ID is consistent
2. Verify `storage` API is used (not just in-memory)
3. Check for hibernation-related issues

## Monitoring Dashboards

### Rate Limiting Dashboard

View real-time rate limiting metrics:

```
https://your-worker.your-subdomain.workers.dev/admin/dashboard/rate-limits
```

Displays:
- Total requests and blocked requests (24h)
- Block rate percentage
- Top clients by request volume
- Hourly request distribution

### Performance Dashboard

View Web Vitals and performance metrics:

```
https://your-worker.your-subdomain.workers.dev/admin/dashboard/performance
```

Displays:
- Core Web Vitals (LCP, FID, CLS, INP) with scoring
- Cache hit rates for routes and stations
- API response times (P95)

### Alert History

View received webhook alerts for testing:

```
https://your-worker.your-subdomain.workers.dev/admin/alerts/history
```

### Alert Webhook Stubs

Test alert integrations without sending real notifications:

```bash
# Test PagerDuty webhook
curl -X POST https://your-worker.your-subdomain.workers.dev/admin/alerts/webhook/pagerduty \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "test-key",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert",
      "severity": "warning",
      "source": "test"
    }
  }'

# Test Slack webhook
curl -X POST https://your-worker.your-subdomain.workers.dev/admin/alerts/webhook/slack \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message from EV Overlay"}'

# Trigger test alerts via dashboard
curl -X POST https://your-worker.your-subdomain.workers.dev/admin/alerts/test/pagerduty
curl -X POST https://your-worker.your-subdomain.workers.dev/admin/alerts/test/slack
```

## Architecture Overview

```
User → Cloudflare Pages (Vue SPA)
           ↓
     Cloudflare Workers (/api/*)
           ↓
    ┌──────┴──────┬─────────────┐
    ↓             ↓             ↓
   D1 (SQLite)   KV (Cache)    Durable Objects
   (Source of    (Hot data)    (Rate limits,
    Truth)                      ingest locks)
    ↓
   Queues → Ingestion Worker → R2 (Snapshots)
                ↓
          OpenChargeMap API
```

## Next Steps

1. Read [research.md](./research.md) for technology decisions
2. Review [data-model.md](./data-model.md) for database schema
3. Check [api-contracts.md](./contracts/api-contracts.md) for API specs
4. Run `/speckit.tasks` to see implementation tasks
