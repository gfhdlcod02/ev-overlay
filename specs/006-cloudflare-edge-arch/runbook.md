# Operational Runbook: Cloudflare Edge-Native Architecture

**Feature**: 006-cloudflare-edge-arch
**Last Updated**: 2026-03-07
**Applies To**: Production and Staging Environments

---

## Table of Contents

1. [Data Ingestion Failures](#data-ingestion-failures)
2. [Database Connectivity Issues](#database-connectivity-issues)
3. [Rate Limiting Anomalies](#rate-limiting-anomalies)
4. [External API Failures](#external-api-failures)
5. [Cache Issues](#cache-issues)
6. [Emergency Contacts](#emergency-contacts)

---

## Data Ingestion Failures

### Symptoms

- Alert: "Ingestion job failed"
- Queue depth increasing
- New charging stations not appearing in search results
- `ingestion_jobs` table shows failed/partial statuses

### Diagnostic Steps

1. **Check ingestion job status**:
   ```sql
   SELECT * FROM ingestion_jobs
   WHERE status IN ('failed', 'partial')
   ORDER BY started_at DESC
   LIMIT 5;
   ```

2. **Check queue depth** (Cloudflare Dashboard):
   - Navigate to Workers & Pages → Queues → ingestion-jobs
   - Look for message backlog

3. **Review worker logs**:
   ```bash
   wrangler tail --environment production
   ```

### Resolution Procedures

#### Scenario A: OpenChargeMap API Unavailable

1. Check OCM status page: https://status.openchargemap.org
2. If temporary outage, queue will retry automatically with exponential backoff
3. If prolonged outage (>1 hour):
   - Pause cron trigger temporarily
   - Monitor existing data freshness
   - Resume when OCM is back online

#### Scenario B: Partial Ingestion Failure

1. Identify failed records from logs
2. Check dead-letter queue:
   ```bash
   wrangler queue list
   ```
3. For retryable failures:
   ```bash
   # Manually re-queue specific pages
   wrangler queue publish ingestion-jobs '{"type":"FETCH_OCM_PAGE","page":X}'
   ```

#### Scenario C: D1 Write Failures

1. Check D1 status in Cloudflare Dashboard
2. If D1 is degraded:
   - System will continue serving cached data from KV
   - Queue messages will persist and retry
   - Monitor `station_snapshots` for data consistency

### Prevention

- Set up PagerDuty alert for >3 consecutive ingestion failures
- Monitor queue depth >100 messages
- Weekly audit of ingestion job success rates

---

## Database Connectivity Issues

### Symptoms

- Increased error rate on `/api/v1/stations` and `/api/v1/routes`
- Worker logs show "D1_ERROR" or timeout messages
- Response times >3 seconds (degraded mode)

### Diagnostic Steps

1. Check D1 status page (Cloudflare Status)
2. Verify connectivity:
   ```bash
   curl https://api.ev-overlay.com/api/health
   ```
3. Check if KV fallback is active:
   - Look for `X-Cache: HIT` or `X-Cache: STALE` headers

### Resolution Procedures

#### Scenario A: D1 Temporary Unavailable

System will automatically:
- Serve cached data from KV with `Cache-Control: stale-while-revalidate`
- Queue writes for retry
- Log degraded mode activation

**Manual intervention**:
1. Monitor health endpoint every 30 seconds
2. If D1 unavailable >5 minutes, consider manual KV cache refresh
3. Post-incident: verify data consistency

#### Scenario B: Query Performance Degradation

1. Check slow query logs in Cloudflare Dashboard
2. Common causes:
   - Missing index (verify all indexes from schema.sql)
   - Large result sets (add pagination)
   - Lock contention during ingestion

3. Emergency query optimization:
   ```sql
   -- Check for long-running queries
   -- (Use Cloudflare D1 query insights)
   ```

### Prevention

- Keep connection pool within Worker limits
- Use KV cache for hot paths
- Set query timeouts (5 seconds max)
- Regular index maintenance

---

## Rate Limiting Anomalies

### Symptoms

- Legitimate users receiving 429 errors
- Rate limit metrics show unexpected spikes
- Durable Object errors in logs

### Diagnostic Steps

1. Check rate limit dashboard (if available)
2. Review `rate_limit_log` table:
   ```sql
   SELECT client_key, COUNT(*) as requests
   FROM rate_limit_log
   WHERE window_start > datetime('now', '-1 hour')
   GROUP BY client_key
   ORDER BY requests DESC
   LIMIT 10;
   ```

3. Verify DO health:
   ```bash
   wrangler durable-object list --namespace RATE_LIMITER
   ```

### Resolution Procedures

#### Scenario A: False Positive Rate Limiting

1. Identify affected client IPs
2. Temporarily increase limits for specific IPs:
   - Update `RATE_LIMIT_REQUESTS_PER_HOUR` env var
   - Or implement allowlist in DO logic

3. If DO unavailable:
   - System falls back to in-memory limiting
   - Less precise but maintains protection
   - Monitor DO recovery

#### Scenario B: DDoS or Abuse

1. Confirm attack pattern:
   - Unusual traffic volume from specific IPs
   - Non-human request patterns

2. Emergency mitigation:
   ```bash
   # Add IP to blocklist (requires Cloudflare Access/WAF)
   # Or implement emergency rate limit reduction
   wrangler secret put EMERGENCY_RATE_LIMIT --env production
   # Value: 10 (extremely restrictive)
   ```

3. Enable Cloudflare DDoS protection (if not already active)

### Prevention

- Gradual rate limit increases
- Monitor for unusual patterns
- Implement CAPTCHA for suspicious traffic
- Regular DO health checks

---

## External API Failures

### Symptoms

- Route calculation failures
- "ROUTE_CALCULATION_FAILED" errors
- OSRM or Google Maps API timeouts

### Diagnostic Steps

1. Check external API status:
   - Google Maps Platform Status
   - OSRM demo server status

2. Review error rates by provider:
   ```bash
   wrangler tail --environment production | grep "provider_error"
   ```

3. Verify API keys:
   ```bash
   wrangler secret list --env production
   ```

### Resolution Procedures

#### Scenario A: Google Maps API Quota Exhausted

1. Check quota usage in Google Cloud Console
2. Emergency options:
   - Switch to OSRM fallback (automatic after 3 retries)
   - Request quota increase from Google
   - Enable billing if not already enabled

#### Scenario B: OSRM Unavailable

System automatically:
- Retries with exponential backoff
- Falls back to cached routes if available
- Returns 503 with retry guidance to user

**Manual intervention**:
1. If prolonged outage, consider temporary Google Maps exclusive mode
2. Update wrangler.toml to change provider priority

### Prevention

- Monitor API quota usage (set alerts at 80%)
- Implement circuit breaker pattern
- Maintain cache hit rate >80%
- Regular API key rotation

---

## Cache Issues

### Symptoms

- Increased D1 read load
- Cache hit rate drops
- Stale data served to users

### Diagnostic Steps

1. Check KV metrics in Cloudflare Dashboard
2. Review cache hit/miss ratio:
   ```bash
   # From worker logs
   wrangler tail | grep "cache_"
   ```

3. Verify KV namespace bindings:
   ```bash
   wrangler kv namespace list
   ```

### Resolution Procedures

#### Scenario A: Cache Invalidation Failure

1. Manual cache flush:
   ```bash
   # List keys
   wrangler kv key list --namespace-id=ROUTE_CACHE_ID

   # Delete specific keys if needed
   wrangler kv key delete "route:specific_hash" --namespace-id=ROUTE_CACHE_ID
   ```

2. Bulk invalidation (emergency):
   ```bash
   # Delete all route cache keys (use with caution)
   wrangler kv bulk delete --namespace-id=ROUTE_CACHE_ID routes-to-delete.txt
   ```

#### Scenario B: KV Write Failures

1. Check KV write limits (Cloudflare limits apply)
2. If rate limited:
   - Writes will be queued
   - System continues serving stale data
   - Monitor for recovery

### Prevention

- Monitor cache hit rate (alert if <70%)
- Implement cache warming after ingestion
- Regular TTL verification

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Primary On-Call | DevOps Team | Slack #alerts-critical |
| Secondary | Engineering Lead | Slack #engineering-leads |
| External (Cloudflare) | Support Portal | Priority P1 for outages |
| External (Google Maps) | Cloud Console | Standard support channels |

---

## Quick Reference: Emergency Commands

```bash
# Check worker logs
wrangler tail --environment production

# Check D1 status
wrangler d1 execute ev-overlay-prod --command "SELECT 1"

# List KV keys
wrangler kv key list --namespace-id=<ID>

# Trigger manual ingestion
wrangler queue publish ingestion-jobs '{"type":"FETCH_OCM_PAGE","page":1}'

# Rollback deployment (emergency)
wrangler deploy --environment production --compatibility-date=2024-01-01
```

---

## Runbook Maintenance

- Review monthly for accuracy
- Update after each incident
- Validate procedures quarterly in staging
- Version control changes
