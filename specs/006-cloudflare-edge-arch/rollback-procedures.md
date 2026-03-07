# Rollback Procedures: Cloudflare Edge-Native Architecture

**Feature**: 006-cloudflare-edge-arch
**Last Updated**: 2026-03-07
**Target Recovery Time**: 15 minutes

---

## Overview

This document defines rollback procedures for the Cloudflare edge-native architecture migration. Each phase has specific rollback steps to restore service using the previous architecture.

---

## Rollback Scenarios

### Scenario 1: New Infrastructure Failure (Phase 3+)

**Trigger**: New D1/KV-based system failing in production

**Steps**:

1. **Immediate (0-2 minutes)**:
   ```bash
   # Switch DNS to old infrastructure
   # Update Cloudflare Pages routing rules
   # Or change API endpoint in frontend config
   ```

2. **Verify (2-5 minutes)**:
   - Check health endpoint on old infrastructure
   - Verify route calculation working
   - Monitor error rates

3. **Communication (5-10 minutes)**:
   - Post status update
   - Notify team via Slack
   - Create incident report

### Scenario 2: Shadow Traffic Issues

**Trigger**: Discrepancies detected during shadow traffic validation

**Steps**:

1. **Disable shadow traffic**:
   ```bash
   # Set shadow traffic percentage to 0
   wrangler secret put SHADOW_TRAFFIC_PERCENT --env production
   # Value: 0
   ```

2. **Preserve logs for analysis**:
   ```bash
   # Export comparison logs
   wrangler tail --environment production > shadow-traffic-logs.json
   ```

3. **Fix and re-validate in staging**

### Scenario 3: Data Ingestion Pipeline Failure

**Trigger**: Corrupted or incomplete charging station data

**Steps**:

1. **Stop ingestion**:
   ```bash
   # Disable cron trigger
   wrangler trigger delete --name hourly-ingestion
   ```

2. **Restore from snapshot**:
   ```bash
   # List available snapshots in R2
   rclone ls r2:ev-overlay-snapshots

   # Restore specific snapshot (manual process)
   # Requires D1 bulk import
   ```

3. **Clear corrupted cache**:
   ```bash
   wrangler kv bulk delete --namespace-id=STATION_CACHE_ID station-keys.txt
   ```

---

## DNS-Based Cutover Rollback

### Architecture

```
User Request
    │
    ▼
Cloudflare DNS (TTL: 60s)
    │
    ├──▶ [Primary] New Infrastructure (D1/KV/DO)
    │
    └──▶ [Fallback] Old Infrastructure (OSRM proxy)
```

### Rollback Commands

```bash
# Switch DNS to old infrastructure
# Via Cloudflare API or Dashboard

# Option 1: API
export CF_API_TOKEN="your_token"
export ZONE_ID="your_zone_id"

curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/record_id" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "api",
    "content": "old-infrastructure.example.com",
    "ttl": 60
  }'

# Option 2: Wrangler (if using Workers Routes)
wrangler route delete "api.ev-overlay.com/*"
wrangler route add "api.ev-overlay.com/*" --script old-worker-name
```

---

## Database Rollback

### D1 Rollback (Emergency)

**Note**: D1 does not have built-in point-in-time recovery. Use R2 snapshots.

```bash
# 1. Export current state (for forensics)
wrangler d1 export ev-overlay-prod --output=pre-rollback.sql

# 2. Identify last known good snapshot
# Check station_snapshots table or R2 bucket

# 3. Restore procedure (requires downtime)
# - Disable writes (maintenance mode)
# - Truncate affected tables
# - Import from snapshot
# - Re-enable writes
```

### KV Cache Rollback

```bash
# Quick cache flush (emergency)
wrangler kv namespace delete --namespace-id=ROUTE_CACHE_ID
wrangler kv namespace create "ROUTE_CACHE_EMERGENCY"
# Update wrangler.toml binding

# Or bulk delete
wrangler kv bulk delete --namespace-id=ROUTE_CACHE_ID all-keys.txt
```

---

## Rollback Verification Checklist

- [ ] Health endpoint returns 200
- [ ] Route calculation working (test Bangkok → Chiang Mai)
- [ ] Station queries return results
- [ ] No 5xx errors in logs
- [ ] Response times <3 seconds
- [ ] Error rate <1%
- [ ] Frontend loads correctly

---

## Post-Rollback Actions

1. **Incident Report** (within 1 hour):
   - Root cause analysis
   - Timeline of events
   - Impact assessment

2. **Fix Development**:
   - Address root cause in staging
   - Add regression tests
   - Re-run full test suite

3. **Re-attempt Planning**:
   - Schedule next migration attempt
   - Add additional safeguards
   - Extend monitoring period

---

## Rollback Testing

**Quarterly Drill**: Practice rollback in staging environment

```bash
# Staging rollback test
./scripts/test-rollback.sh staging

# Verify staging rollback
./scripts/verify-rollforward.sh staging
```

---

## Contact Escalation

| Time | Action | Contact |
|------|--------|---------|
| 0-5 min | Execute rollback | On-call engineer |
| 5-15 min | Verify and monitor | Engineering team |
| 15-30 min | Incident communication | Engineering lead |
| 30+ min | Post-mortem scheduling | Engineering manager |
