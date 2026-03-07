# Data Model: Cloudflare Edge-Native Architecture

**Date**: 2026-03-07
**Database**: Cloudflare D1 (SQLite)

## Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  ChargingStation │────▶│  StationConnector│     │  IngestionJob    │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │     │ id (PK)          │
│ external_id      │     │ station_id (FK)  │     │ started_at       │
│ name             │     │ connector_type   │     │ completed_at     │
│ operator         │     │ power_kw         │     │ status           │
│ latitude         │     │ status           │     │ records_processed│
│ longitude        │     └──────────────────┘     │ records_created  │
│ address          │                              │ records_updated  │
│ city             │     ┌──────────────────┐     │ error_message    │
│ country          │     │  StationSnapshot │     └──────────────────┘
│ status           │     ├──────────────────┤              │
│ created_at       │     │ id (PK)          │              │
│ updated_at       │     │ job_id (FK)      │◀─────────────┘
└──────────────────┘     │ station_id (FK)  │
                         │ snapshot_data    │
                         │ created_at       │
                         └──────────────────┘
```

## D1 Schema

### Table: charging_stations

Primary table for charging station source of truth.

```sql
CREATE TABLE charging_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE NOT NULL,      -- OpenChargeMap ID
  name TEXT NOT NULL,
  operator TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  status TEXT DEFAULT 'operational',     -- operational, closed, planned
  usage_type TEXT,                        -- public, private, etc.
  is_operational BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME,

  -- Spatial index for geo queries
  CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180)
);

-- Indexes
CREATE INDEX idx_stations_location ON charging_stations(latitude, longitude);
CREATE INDEX idx_stations_external ON charging_stations(external_id);
CREATE INDEX idx_stations_updated ON charging_stations(updated_at);
CREATE INDEX idx_stations_bbox ON charging_stations(
  latitude, longitude
) WHERE status = 'operational';
```

### Table: station_connectors

Individual connectors at each charging station.

```sql
CREATE TABLE station_connectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  connector_type TEXT NOT NULL,          -- CHAdeMO, CCS, Type2, etc.
  power_kw REAL,                         -- Maximum power output
  voltage INTEGER,
  amperage INTEGER,
  status TEXT DEFAULT 'available',       -- available, occupied, out_of_order
  quantity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

CREATE INDEX idx_connectors_station ON station_connectors(station_id);
CREATE INDEX idx_connectors_type ON station_connectors(connector_type);
```

### Table: ingestion_jobs

Track data ingestion runs from OpenChargeMap.

```sql
CREATE TABLE ingestion_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  status TEXT DEFAULT 'running',         -- running, completed, failed, partial
  source TEXT DEFAULT 'openchargemap',   -- Future: multiple sources
  params_json TEXT,                      -- JSON: bbox, modified_since, etc.
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

CREATE INDEX idx_jobs_status ON ingestion_jobs(status);
CREATE INDEX idx_jobs_time ON ingestion_jobs(started_at);
```

### Table: station_snapshots

Historical snapshots for audit trail (references R2 storage).

```sql
CREATE TABLE station_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  station_id INTEGER NOT NULL,
  snapshot_r2_key TEXT NOT NULL,         -- R2 object key
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (job_id) REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

CREATE INDEX idx_snapshots_job ON station_snapshots(job_id);
CREATE INDEX idx_snapshots_station ON station_snapshots(station_id);
```

### Table: rate_limit_log

Audit log for rate limiting (optional, for debugging).

```sql
CREATE TABLE rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_key TEXT NOT NULL,              -- IP or user ID hash
  request_count INTEGER,
  window_start DATETIME,
  limited BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ratelog_client ON rate_limit_log(client_key, window_start);
```

## KV Cache Structures

### Route Cache

**Key**: `route:{hash}`
**TTL**: 7 days

```typescript
interface CachedRoute {
  version: 1;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  distance: number;           // meters
  duration: number;           // seconds
  polyline: string;           // Encoded polyline
  chargingStops: ChargingStop[];
  cachedAt: string;           // ISO timestamp
  expiresAt: string;          // ISO timestamp
}
```

### Station Query Cache

**Key**: `stations:bbox:{lat1},{lng1},{lat2},{lng2}`
**TTL**: 1 hour

```typescript
interface CachedStationQuery {
  version: 1;
  bbox: [number, number, number, number]; // [lat1, lng1, lat2, lng2]
  stations: CompactStation[];
  totalCount: number;
  cachedAt: string;
}

interface CompactStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  connectors: CompactConnector[];
}
```

### Single Station Cache

**Key**: `station:{id}`
**TTL**: 1 hour

```typescript
interface CachedStation {
  version: 1;
  station: ChargingStation;
  connectors: StationConnector[];
  cachedAt: string;
}
```

## Durable Object State

### RateLimitBucket

**Stored in DO memory + persistent storage**:

```typescript
interface RateLimitState {
  clientKey: string;          // IP hash or user ID
  requests: number[];         // Timestamps of requests (last hour)
  limit: number;              // Max requests per hour (default: 100)
  windowMs: number;           // Time window (default: 3600000)
  lastReset: number;          // Timestamp of last counter reset
}
```

### IngestionLock

**Stored in DO memory + persistent storage**:

```typescript
interface IngestionLockState {
  locked: boolean;
  acquiredAt: number | null;
  acquiredBy: string | null;  // Job ID or worker instance
  timeoutMs: number;          // Lock timeout (default: 300000 = 5min)
  lastHeartbeat: number;
}
```

## R2 Snapshot Format

**Key**: `snapshots/{YYYY}/{MM}/{DD}/{timestamp}-{job-id}.jsonl`
**Content**: JSON Lines format

```jsonl
{"station_id": 123, "external_id": "OCM-456", "snapshot_at": "2026-03-07T10:00:00Z", "data": {...}}
{"station_id": 124, "external_id": "OCM-789", "snapshot_at": "2026-03-07T10:00:00Z", "data": {...}}
```

## Migration Strategy

### Phase 1: Initial Schema

```sql
-- Initial D1 migration (schema.sql)
-- Creates all tables with indexes
-- Seeds with minimal data if needed
```

### Schema Evolution

**Version tracking**: Store schema version in D1

```sql
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema');
```

## Query Patterns

### Find stations within bounding box

```sql
SELECT * FROM charging_stations
WHERE latitude BETWEEN ? AND ?
  AND longitude BETWEEN ? AND ?
  AND status = 'operational'
ORDER BY latitude, longitude;
```

### Find station with connectors

```sql
SELECT s.*, json_group_array(
  json_object(
    'id', c.id,
    'type', c.connector_type,
    'power', c.power_kw
  )
) as connectors
FROM charging_stations s
LEFT JOIN station_connectors c ON s.id = c.station_id
WHERE s.id = ?
GROUP BY s.id;
```

### Upsert from OCM data

```sql
-- Insert or update station
INSERT INTO charging_stations (
  external_id, name, operator, latitude, longitude,
  address, city, country, status, updated_at, last_synced_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(external_id) DO UPDATE SET
  name = excluded.name,
  operator = excluded.operator,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  address = excluded.address,
  city = excluded.city,
  country = excluded.country,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP,
  last_synced_at = CURRENT_TIMESTAMP;
```

## Size Estimates

| Entity | Count | Avg Size | Total |
|--------|-------|----------|-------|
| Charging stations | 10,000 | 500 bytes | 5 MB |
| Connectors | 30,000 | 200 bytes | 6 MB |
| Ingestion jobs (1 year) | 365 | 200 bytes | 73 KB |
| Snapshots (metadata) | 10,000 | 100 bytes | 1 MB |
| **Total D1** | - | - | **~12 MB** |

Well within 500MB D1 limit.
