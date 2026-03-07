# Research: Cloudflare Edge-Native Architecture

**Date**: 2026-03-07
**Feature**: Cloudflare Edge-Native Re-architecture

## Technology Evaluation

### D1 (SQLite at Edge)

**Decision**: Use as source of truth for charging stations

**Rationale**:
- Serverless, zero-config SQLite database at Cloudflare's edge
- 500MB storage limit sufficient for ~10,000 charging stations with metadata
- ACID transactions ensure data consistency during concurrent ingestion
- SQL interface familiar to developers; migration from other SQL databases straightforward
- Integrated with Workers: `env.DB.prepare()` API

**Considerations**:
- Query latency: ~5-50ms within same region
- Write limit: ~50 writes/sec per database (sufficient for <1,000 daily changes)
- No foreign key constraints enforced (must handle in application code)
- 6MB maximum response size per query

**Alternatives Rejected**:
- **KV as source of truth**: No ACID, no querying capabilities, eventual consistency
- **External PostgreSQL**: Adds infrastructure complexity, latency from edge to central DB
- **FaunaDB**: Additional vendor, learning curve, overkill for 10K records

---

### KV (Key-Value Cache)

**Decision**: Use for hot read cache (routes, station queries)

**Rationale**:
- Sub-millisecond read latency globally
- 7-day TTL matches data retention requirement (DR-001)
- Automatic edge replication; cache hits never hit origin
- Simple key-value API suitable for serialized route data

**Key Structure**:
```
route:{hash(origin,dest,params)} → serialized route
stations:bbox:{lat1,lng1,lat2,lng2} → station list
stations:metadata:{id} → single station
```

**Considerations**:
- Eventual consistency: Updates may take 60s to propagate
- 25MB max value size (sufficient for routes)
- 2 billion keys per namespace

---

### Durable Objects (DO)

**Decision**: Use for rate limiting and ingestion locks

**Use Case 1: Rate Limiting**
- Singleton DO per rate limit key (IP address or user ID)
- In-memory counter with persistence for cross-request state
- Colocated with requesting user for minimal latency

**Use Case 2: Ingestion Locks**
- Single DO for global ingest coordination
- Prevents concurrent OCM fetches from causing race conditions
- Lock acquired at start, released on completion or timeout

**Considerations**:
- 128MB memory limit per DO
- Hibernation after inactivity (auto-save/restore state)
- Single-threaded execution guarantees consistency

---

### Queues

**Decision**: Use for asynchronous data ingestion

**Rationale**:
- Decouples OCM API fetching from API Worker
- Built-in retry with exponential backoff
- Batching support for efficient processing
- Backpressure handling when ingestion falls behind

**Message Types**:
1. `FETCH_OCM_PAGE` - Fetch a specific page of OCM results
2. `PROCESS_BATCH` - Process and upsert normalized records
3. `WRITE_SNAPSHOT` - Write historical snapshot to R2

**Considerations**:
- At-least-once delivery (messages may be processed twice; design for idempotency)
- 128KB max message size
- 10,000 messages per batch limit

---

### R2 (Object Storage)

**Decision**: Use for historical snapshots

**Rationale**:
- S3-compatible API, zero-egress fees within Cloudflare
- Cost-effective for audit/historical data
- 90-day retention per requirements; lifecycle policies can auto-delete

**Object Key Structure**:
```
snapshots/{YYYY}/{MM}/{DD}/{timestamp}-{job-id}.jsonl
```

---

### Pages (Static Hosting)

**Decision**: Use for Vue 3 SPA hosting

**Rationale**:
- Native integration with Workers (same project, shared config)
- Automatic HTTPS, edge deployment, asset optimization
- Preview deployments for every PR
- Functions support for server-side rendering if needed later

---

## Architecture Patterns

### Migration Pattern: Shadow Traffic

**Phase 2 Strategy**:
1. Deploy new architecture alongside existing
2. Route 1% of traffic to new system (canary)
3. Compare responses: log differences, alert on mismatch
4. Gradually increase: 1% → 10% → 50% → 100%
5. At each stage, monitor error rates and latency
6. Rollback: DNS cutover back to old system (60s TTL)

**Validation Criteria**:
- Error rate < 0.1% at each traffic level
- P95 latency within 20% of existing system
- Zero response mismatches for route calculations

### Caching Pattern: Cache-Aside with TTL

```
Request → Check KV → Cache Hit? → Yes: Return
                              ↓ No
                    Fetch from D1 → Store in KV → Return
```

**Invalidation**:
- Time-based: 7-day automatic TTL
- Event-based: Ingestion job invalidates affected keys

### Rate Limiting Pattern: Sliding Window

```typescript
// Durable Object implementation
async fetch(request) {
  const now = Date.now();
  const windowStart = now - 3600000; // 1 hour

  // Remove old entries
  this.requests = this.requests.filter(t => t > windowStart);

  if (this.requests.length >= LIMIT) {
    return new Response('Rate limited', { status: 429 });
  }

  this.requests.push(now);
  return forward(request);
}
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| D1 write limits exceeded | Low | Medium | Batch writes; queue-based throttling |
| Durable Object hibernation latency | Medium | Low | Acceptable for rate limiting (adds ~100ms) |
| KV eventual consistency staleness | Medium | Low | 7-day TTL acceptable for route data |
| Migration data inconsistency | Low | High | Shadow traffic validation; rollback capability |
| OCM API changes breaking ingestion | Medium | Medium | Schema validation; alerting on parse failures |

## Performance Benchmarks (Target)

| Metric | Target | Measurement |
|--------|--------|-------------|
| KV read | <10ms | Cloudflare edge colocation |
| D1 query | <50ms | Same-region query |
| D1 write | <100ms | Single row upsert |
| DO latency | <50ms | Same-region invocation |
| Queue processing | <500ms/msg | End-to-end ingestion |

## References

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Queues Documentation](https://developers.cloudflare.com/queues/)
- [OpenChargeMap API](https://openchargemap.org/site/develop/api)
