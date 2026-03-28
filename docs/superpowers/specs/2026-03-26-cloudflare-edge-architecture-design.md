# Cloudflare Edge-Native Architecture Design

**Date**: 2026-03-26
**Status**: Approved for Implementation
**Related**: Architecture diagram (Mermaid flowchart)

## Overview

Transition the EV Overlay project from a simple Cloudflare Worker + KV architecture to a full edge-native architecture using multiple Cloudflare services.

## Current State

- **Frontend**: Vue 3 + Vite (dev server only)
- **Backend**: Single Cloudflare Worker
- **Storage**: Cloudflare KV (route caching only)
- **Routing**: OSRM API (external)
- **Rate Limiting**: Simple in-memory/KV based
- **No database, no queues, no durable objects**

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│    Pages    │  Workers    │     DO      │     D1      │   KV    │
│  (Static    │   (API      │  (Rate      │ (Stations   │  (Hot   │
│    SPA)     │  Gateway)   │   Limit)    │   Index)    │  Cache) │
└──────┬──────┴──────┬──────┴─────────────┴─────────────┴─────────┘
       │             │
       │             ▼
       │    ┌─────────────────┐
       │    │  Google Routes  │
       │    │  (Primary)      │
       │    └─────────────────┘
       │
       ▼
┌─────────────────┐
│   Google Maps   │
│   JS SDK        │
└─────────────────┘
```

## Feature Decomposition

The implementation is split into **8 independent features** deployed in sequence:

| # | Feature | Purpose | Dependencies |
|---|---------|---------|--------------|
| 1 | Cloudflare Pages + CI/CD | Production frontend hosting | None |
| 2 | Durable Objects Rate Limiting | Distributed rate limiting (global + per-IP) | None |
| 3 | D1 Database Schema | Charging stations data storage | None |
| 4 | Data Ingest Pipeline | Manual entry + gradual data population | Feature 3 |
| 5 | Station Search API | Query stations by location/type | Feature 3, 4 |
| 6 | Google Routes Integration | Replace OSRM with Google Routes API | None |
| 7 | ~~R2 Snapshots~~ | ~~Data snapshots~~ | **REMOVED** |
| 8 | Observability | Logpush/Analytics setup | All above |

## Key Design Decisions

### 1. Geography: Thailand Only
- Scope limited to Thailand (~500-1000 charging stations)
- Simplifies data ingestion
- Fits D1 performance characteristics

### 2. Data Source: Manual Entry + Gradual Expansion
- No reliable API for Thai charging stations exists
- Start with admin interface for manual entry
- Community submissions in future iterations

### 3. Rate Limiting: Global + Per-IP Quotas
- Per-IP: Prevent abuse from individual users
- Global: Prevent cost overrun from all users combined
- Implemented via Durable Objects for consistency across edge locations

### 4. Caching Strategy: Aggressive (7 days)
- Routes cached for 7 days to minimize Google Routes API costs
- Station data cached in KV with shorter TTL (1 hour)
- Cache invalidation via admin API

### 5. Deployment: CI/CD via GitHub Actions
- Automated build, test, deploy pipeline
- Preview deployments for PRs
- Production deployment on merge to main

## Data Flow

### Route Planning Flow
```
User Request
    │
    ▼
┌───────────────┐
│  Rate Limit   │ ──► Reject if over limit
│  Check (DO)   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   KV Cache    │ ──► Return cached route if hit
│   Check       │
└───────┬───────┘
        │ cache miss
        ▼
┌───────────────┐
│  D1 Query     │ ──► Find charging stations along route
│  (Stations)   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Google Routes │ ──► Calculate optimal route with stops
│ API Call      │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Cache &      │ ──► Store in KV (7-day TTL)
│  Return       │
└───────────────┘
```

### Data Ingest Flow (Manual)
```
Admin Interface
      │
      ▼
┌─────────────┐
│  Validation │
│  (Schema)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  D1 Insert  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  KV Update  │ ──► Update cache for new station
└─────────────┘
```

## Error Handling Strategy

| Failure | Response |
|---------|----------|
| D1 timeout | Return stale KV data with warning header |
| Google API rate limit | Queue for retry, return OSRM fallback temporarily |
| DO unavailable | Allow request (degraded rate limiting) |
| Cache miss + API down | Return 503 with retry-after |

## Cost Optimization

| Service | Cost Control |
|---------|--------------|
| Google Routes | 7-day cache + global quota limit |
| D1 | Read-heavy design, write only on ingest |
| KV | High TTL for routes, selective cache for stations |
| DO | Efficient counter design, minimal state |

## Testing Strategy

| Layer | Approach |
|-------|----------|
| Unit | Vitest for business logic |
| Integration | Miniflare for Workers/DO/D1 |
| E2E | Playwright for full flows |
| Load | Artillery/k6 for rate limiting tests |

## Success Criteria

1. **Deploy**: Zero-downtime deployment to Pages + Workers
2. **Performance**: p99 API response < 500ms (cached), < 2s (uncached)
3. **Reliability**: 99.9% uptime with graceful degradation
4. **Cost**: Google API calls < 1000/day (cached), < 10000/day (uncached)
5. **Data**: 500+ stations indexed within 1 month of launch

## Out of Scope

- R2 snapshots (removed - not cost-effective for this scale)
- Queues (not needed with manual entry approach)
- Consumer Worker (not needed without external API ingestion)
- Real-time availability (no data source available)
- Multi-region support (Thailand only)

## Next Steps

1. Create specs for Feature 1 (Cloudflare Pages + CI/CD)
2. Proceed through each feature sequentially
3. Validate after each feature before proceeding

---

**Approved by**: User
**Date**: 2026-03-26
