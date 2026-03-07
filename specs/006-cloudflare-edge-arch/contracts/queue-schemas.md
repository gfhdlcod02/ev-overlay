# Queue Message Schemas

**Date**: 2026-03-07
**Queue**: Cloudflare Queues

## Queue: `ingestion-jobs`

Primary queue for data ingestion from external providers.

### Message Types

#### 1. FETCH_OCM_PAGE

Fetch a page of charging station data from OpenChargeMap.

```typescript
interface FetchOcmPageMessage {
  type: "FETCH_OCM_PAGE";
  jobId: number;             // References ingestion_jobs.id
  page: number;              // Page number (1-based)
  pageSize: number;          // Records per page (max: 1000)
  filters: {
    modifiedSince?: string;  // ISO timestamp
    countryCode?: string;    // "TH", etc.
    boundingBox?: {          // [lat1, lng1, lat2, lng2]
      lat1: number;
      lng1: number;
      lat2: number;
      lng2: number;
    };
  };
  retryCount: number;        // Current retry attempt (0-indexed)
  createdAt: string;         // ISO timestamp
}
```

**Behavior**:
- Fetches data from OCM API
- Emits PROCESS_BATCH message for each batch of records
- If more pages exist, emits next FETCH_OCM_PAGE
- Updates ingestion_jobs record with progress

**Retry Policy**:
- Max 3 retries with exponential backoff (1s, 5s, 25s)
- After max retries, marks job as "partial" and alerts

---

#### 2. PROCESS_BATCH

Process and normalize a batch of charging station records.

```typescript
interface ProcessBatchMessage {
  type: "PROCESS_BATCH";
  jobId: number;
  batchId: string;           // UUID for this batch
  records: OcmStationRecord[];
  options: {
    skipValidation?: boolean; // For recovery scenarios
    dryRun?: boolean;         // Validate without writing (for testing)
  };
  retryCount: number;
  createdAt: string;
}

// Raw OCM record format (normalized)
interface OcmStationRecord {
  externalId: string;        // OCM ID
  name: string;
  operator?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  connectors: OcmConnector[];
  metadata?: {
    usageType?: string;
    paymentRequired?: boolean;
    accessRestrictions?: string[];
  };
}

interface OcmConnector {
  type: string;              // OCM connector type ID
  powerKw?: number;
  voltage?: number;
  amperage?: number;
  status?: string;
}
```

**Behavior**:
- Validates records against schema
- Upserts to D1 (charging_stations, station_connectors)
- Invalidates affected KV cache entries
- Emits WRITE_SNAPSHOT for audit trail
- Idempotent: Re-processing same batch is safe

**Deduplication**:
- Uses external_id for station deduplication
- Checks last_synced_at to avoid unnecessary updates

---

#### 3. WRITE_SNAPSHOT

Write historical snapshot to R2 for audit trail.

```typescript
interface WriteSnapshotMessage {
  type: "WRITE_SNAPSHOT";
  jobId: number;
  batchId: string;
  stationIds: number[];      // IDs of stations in this snapshot
  r2Key: string;             // Pre-computed R2 key
  format: "jsonl" | "parquet"; // Future: Parquet for analytics
  retryCount: number;
  createdAt: string;
}
```

**Behavior**:
- Fetches current state of stations from D1
- Writes to R2 in JSON Lines format
- Updates station_snapshots table with R2 key
- Low priority: Can be delayed if queue backlog

---

#### 4. INVALIDATE_CACHE

Invalidate KV cache entries after data changes.

```typescript
interface InvalidateCacheMessage {
  type: "INVALIDATE_CACHE";
  patterns: string[];        // Key patterns to invalidate, e.g., ["stations:bbox:*"]
  stationIds?: number[];     // Specific station IDs to invalidate
  createdAt: string;
}
```

**Behavior**:
- Deletes matching keys from KV
- Non-blocking: Cache miss falls back to D1
- Usually emitted after PROCESS_BATCH completes

---

## Queue: `ingestion-retries`

Dead-letter queue for failed messages requiring manual review.

### Message Type: FAILED_OPERATION

```typescript
interface FailedOperationMessage {
  originalMessage: FetchOcmPageMessage | ProcessBatchMessage | WriteSnapshotMessage;
  error: {
    code: string;
    message: string;
    stack?: string;
  };
  failedAt: string;
  retryable: boolean;        // Can this be retried later?
}
```

**Behavior**:
- Manual review via Cloudflare dashboard or CLI
- Retryable messages can be re-queued
- Non-retryable messages alert for manual intervention

---

## Message Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cron Trigger   │────▶│  FETCH_OCM_PAGE  │────▶│   OCM API Call  │
│  (hourly)       │     │  (Queue message) │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
           ┌─────────────────┐
           │  Process Data   │
           │  (normalize)    │
           └────────┬────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐    ┌──────────┐    ┌──────────┐
│PROCESS │    │  WRITE   │    │INVALIDATE│
│_BATCH  │    │_SNAPSHOT │    │  _CACHE  │
└───┬────┘    └────┬─────┘    └────┬─────┘
    │              │               │
    ▼              ▼               ▼
┌───────┐    ┌──────────┐    ┌──────────┐
│  D1   │    │    R2    │    │    KV    │
│ Upsert│    │ Snapshot │    │  Delete  │
└───────┘    └──────────┘    └──────────┘
```

## Queue Configuration

### ingestion-jobs Queue

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

### Consumer Behavior

- **Batch size**: 10 messages (max to process together)
- **Timeout**: 30 seconds (max processing time per batch)
- **Retries**: 3 attempts with exponential backoff
- **Concurrency**: Single consumer per queue (ensures ordering)

## Monitoring

### Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Queue depth | Cloudflare | > 1000 messages |
| Message age | Cloudflare | > 5 minutes |
| Processing failures | Worker logs | > 1% failure rate |
| Retry rate | Worker logs | > 5% of messages |
| Dead letter queue size | Cloudflare | > 10 messages |

### Log Format

```typescript
interface QueueLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  messageType: string;
  jobId?: number;
  batchId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

## Idempotency Guarantees

All queue message handlers are designed to be idempotent:

1. **FETCH_OCM_PAGE**: Uses page number; re-fetching same page is safe
2. **PROCESS_BATCH**: Uses external_id upsert; re-processing updates same records
3. **WRITE_SNAPSHOT**: Uses R2 key with overwrite allowed
4. **INVALIDATE_CACHE**: Deleting non-existent keys is safe

This ensures at-least-once delivery semantics don't cause data corruption.
