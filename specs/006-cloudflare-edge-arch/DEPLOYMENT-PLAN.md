# Deployment Plan: Cloudflare Edge-Native Architecture

**Feature**: 006-cloudflare-edge-arch
**Branch**: `006-cloudflare-edge-arch` → `main`
**Status**: Production Ready (101/102 tasks complete)
**Date**: 2026-03-08
**Deploy Window**: 2026-04-08 (after 30-day standby period ends)

---

## Executive Summary

Deployment plan for Cloudflare Edge-Native Architecture Migration which is nearly complete (101/102 tasks). Only waiting for the 30-day standby period to end on 2026-04-08.

### Current Status

| Phase                       | Progress | Status                                 |
| --------------------------- | -------- | -------------------------------------- |
| Phase 1: Setup              | 15/15    | ✅ Complete                            |
| Phase 2: Foundational       | 9/9      | ✅ Complete                            |
| Phase 3: US1 Route Planning | 10/10    | ✅ Complete                            |
| Phase 4: US2 Data Ingestion | 15/15    | ✅ Complete                            |
| Phase 5: US3 Migration      | 13/14    | 🔄 93% (T063 pending until 2026-04-08) |
| Phase 6: US4 Rate Limiting  | 7/7      | ✅ Complete                            |
| Phase 7: US5 Performance    | 11/11    | ✅ Complete                            |
| Phase 8: Polish             | 21/21    | ✅ Complete                            |

---

## Pre-Deployment Checklist

### 1. Code Quality Verification

```bash
# 1.1 Run all tests
pnpm test
pnpm test:e2e

# 1.2 Check code quality
pnpm lint
pnpm format:check

# 1.3 Security audit
pnpm audit
npm audit
```

**Checklist:**

- [ ] Unit tests pass (100%)
- [ ] E2E tests pass (100%)
- [ ] No lint errors
- [ ] No security vulnerabilities (critical/high)
- [ ] No unnecessary `console.log`
- [ ] No TODO comments pending
- [ ] No hardcoded secrets

### 2. Infrastructure Verification

```bash
# 2.1 D1 Database
curl https://api.ev-overlay.com/api/health

# 2.2 KV Namespaces
wrangler kv namespace list

# 2.3 Secrets configured
wrangler secret list --env production

# 2.4 Queue status
wrangler queue list
```

**Checklist:**

- [ ] D1 database `ev-overlay-prod` accessible
- [ ] KV namespaces `ROUTE_CACHE`, `STATION_CACHE` exist
- [ ] R2 bucket `ev-overlay-snapshots` accessible
- [ ] Queue `ingestion-jobs` active
- [ ] Secrets configured: `GOOGLE_MAPS_API_KEY`, `OPENCHARGEMAP_API_KEY`
- [ ] Cron triggers configured

### 3. Migration Status Verification

```bash
# 3.1 Verify T063 has completed 30 days
# Started: 2026-03-09
# End Date: 2026-04-08

# 3.2 Run final weekly check
./scripts/migration-monitoring.sh weekly-check

# 3.3 Check old infrastructure
# (should have no traffic to old infra)
```

**Checklist:**

- [ ] 30-day standby period ended (2026-04-08)
- [ ] Final weekly check completed
- [ ] No traffic to old infrastructure
- [ ] All monitoring alerts green

---

## Deployment Steps

### Phase 1: Final Preparation (Day Before Deploy)

```bash
# 1.1 Create release branch
git checkout -b release/v2.0.0

# 1.2 Bump version
npm version 2.0.0 --no-git-tag-version
pnpm version:sync

# 1.3 Remove unnecessary files from branch
# (see details in deploy-cleanup.md)
git rm scripts/shadow-traffic.sh
git rm scripts/migration-monitoring.sh
git rm scripts/verify-*.js
git rm scripts/verify-*.sh
git rm scripts/d1-cleanup.js
git rm scripts/MONITORING-GUIDE.md
git rm scripts/decommission-plan.md
git rm scripts/deployment-tracker.md

# 1.4 Commit cleanup
git add -A
git commit -m "chore(deploy): cleanup migration scripts for v2.0.0"

# 1.5 Push release branch
git push -u origin release/v2.0.0
```

### Phase 2: Deploy to Production

```bash
# 2.1 Deploy Worker API
cd workers/api
pnpm deploy:production

# 2.2 Deploy Pages (Frontend)
cd ../../apps/web
pnpm deploy:production

# 2.3 Verify deployment
curl https://api.ev-overlay.com/api/health
curl https://ev-overlay.com/api/version
```

**Verification Steps:**

- [ ] Worker deployed successfully
- [ ] Pages deployed successfully
- [ ] Health endpoint returns 200
- [ ] Version endpoint returns correct version

### Phase 3: Post-Deploy Verification

```bash
# 3.1 API Health Check
curl -s https://api.ev-overlay.com/api/health | jq

# 3.2 Route Planning Test
curl -X POST https://api.ev-overlay.com/api/v1/routes \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 13.7563, "lng": 100.5018},
    "destination": {"lat": 18.7883, "lng": 98.9853},
    "ev_params": {"current_soc": 80, "max_capacity": 77, "consumption": 0.2}
  }'

# 3.3 Station Query Test
curl "https://api.ev-overlay.com/api/v1/stations?lat=13.7563&lng=100.5018&radius=10"

# 3.4 Rate Limiting Test
curl -I https://api.ev-overlay.com/api/v1/stations

# 3.5 E2E Tests
pnpm test:e2e --project=production
```

---

## Cleanup Tasks (Post-Deploy)

### 1. Infrastructure Cleanup (After 30-day standby)

```bash
# 1.1 Decommission old infrastructure
# (as specified in scripts/decommission-plan.md)

# 1.2 Remove migration-specific resources
# - Old Worker scripts (if any)
# - Temporary KV namespaces (if any)
# - Unused dead-letter queues
```

**Cleanup Checklist:**

- [ ] Old Worker decommissioned
- [ ] Migration-specific KV namespaces deleted
- [ ] Temporary resources removed
- [ ] DNS records cleaned up (if any)

### 2. Documentation Cleanup

```bash
# 2.1 Move migration docs to archive
mkdir -p docs/archive/006-migration
git mv specs/006-cloudflare-edge-arch/rollback-procedures.md docs/archive/006-migration/
git mv specs/006-cloudflare-edge-arch/runbook.md docs/archive/006-migration/
git mv specs/006-cloudflare-edge-arch/checklists/deploy-cleanup.md docs/archive/006-migration/

# 2.2 Keep reference docs
git mv specs/006-cloudflare-edge-arch/data-model.md docs/
git mv specs/006-cloudflare-edge-arch/contracts/*.md docs/

# 2.3 Commit
git add -A
git commit -m "docs: archive migration documents"
```

### 3. Repository Cleanup

```bash
# 3.1 Delete unused branches
git branch -d 006-cloudflare-edge-arch

# 3.2 Tag release
git tag v2.0.0
git push origin v2.0.0

# 3.3 Merge to main
git checkout main
git merge release/v2.0.0 --no-ff -m "chore(release): v2.0.0 - Cloudflare Edge-Native"
git push origin main
```

---

## Rollback Plan

If issues occur during deployment, follow steps in [rollback-procedures.md](./rollback-procedures.md)

### Quick Rollback Commands

```bash
# Rollback Worker
cd workers/api
wrangler deploy --environment production --compatibility-date=2026-03-01

# Rollback Pages
cd apps/web
wrangler pages deploy --environment production --commit-dirty

# Or use script
./scripts/test-rollback.sh production
```

### Rollback Criteria

Rollback immediately if:

- Error rate > 5% for 5 minutes
- P95 latency > 10 seconds for 10 minutes
- Health check fails 3 consecutive times
- User complaints about core functionality

---

## Monitoring Checklist

### First 24 Hours

- [ ] Error rate < 1%
- [ ] P95 latency < 3s (routes), < 1s (cache hits)
- [ ] Cache hit rate > 70%
- [ ] Rate limiting working (no false positives)
- [ ] Ingestion job running hourly
- [ ] No D1 connectivity errors

### First Week

- [ ] Daily error rate review
- [ ] Performance dashboard monitoring
- [ ] Rate limit dashboard review
- [ ] Weekly ingestion audit
- [ ] User feedback monitoring

### First Month

- [ ] Monthly performance review
- [ ] Cost analysis (Cloudflare billing)
- [ ] Security audit
- [ ] Documentation update (if needed)

---

## Success Criteria

Deployment is successful when:

1. **Functionality**: All E2E tests pass
2. **Performance**: P95 latency < 3s for routes, < 1s for cache hits
3. **Reliability**: Error rate < 1% for 24 hours
4. **Monitoring**: All dashboards active and showing green
5. **User Experience**: No increase in support tickets

---

## Appendix

### Related Documents

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [tasks.md](./tasks.md) - Task tracking (101/102 complete)
- [rollback-procedures.md](./rollback-procedures.md) - Rollback procedures
- [runbook.md](./runbook.md) - Operational runbook
- [checklists/deploy-cleanup.md](./checklists/deploy-cleanup.md) - Cleanup checklist

### Emergency Contacts

| Role               | Contact                         |
| ------------------ | ------------------------------- |
| Primary On-Call    | DevOps Team                     |
| Engineering Lead   | #engineering-leads              |
| Cloudflare Support | Support Portal (P1 for outages) |

### Quick Commands Reference

```bash
# Health check
curl https://api.ev-overlay.com/api/health

# View logs
wrangler tail --environment production

# D1 query
wrangler d1 execute ev-overlay-prod --command "SELECT COUNT(*) FROM charging_stations"

# KV list
wrangler kv key list --namespace-id=<ROUTE_CACHE_ID>

# Queue status
wrangler queue list
```

---

**Last Updated**: 2026-03-08
**Version**: 1.0
**Approved By**: [TBD]
