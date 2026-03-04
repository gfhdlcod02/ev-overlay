# Data Model: Simplify Search Form

**Feature**: Simplify Search Form
**Date**: 2026-03-04
**Spec**: [spec.md](./spec.md)

---

## Entities

### CacheEntry

Stores a cached search result with metadata for TTL management.

| Field       | Type          | Description                      |
| ----------- | ------------- | -------------------------------- |
| `result`    | `RouteResult` | The cached route planning result |
| `timestamp` | `number`      | Unix timestamp (ms) when cached  |

**Validation Rules**:

- `timestamp` must be positive integer
- Entry is considered expired if `Date.now() - timestamp > TTL_MS`

**Lifecycle**:

- Created on successful API response
- Read on cache hit (with TTL validation)
- Deleted on eviction (LRU or explicit clear)

---

### PendingRequest

Represents an in-flight API request for deduplication.

| Field        | Type                   | Description                       |
| ------------ | ---------------------- | --------------------------------- |
| `promise`    | `Promise<RouteResult>` | The in-flight request promise     |
| `controller` | `AbortController`      | Controller to cancel this request |

**Behavior**:

- Created when first request for a key is made
- Shared with subsequent identical requests (deduplication)
- Deleted when promise resolves, rejects, or is cancelled

---

### SearchCache (Service/Class)

Manages the LRU cache with TTL eviction.

| Property  | Type                      | Description                                        |
| --------- | ------------------------- | -------------------------------------------------- |
| `cache`   | `Map<string, CacheEntry>` | Underlying storage (Map preserves insertion order) |
| `maxSize` | `number`                  | Maximum entries (50)                               |
| `ttlMs`   | `number`                  | Time-to-live in milliseconds (60000)               |

**Methods**:

| Method            | Input                   | Output                     | Description                            |
| ----------------- | ----------------------- | -------------------------- | -------------------------------------- |
| `get(key)`        | `string`                | `RouteResult \| undefined` | Get cached result if not expired       |
| `set(key, value)` | `string`, `RouteResult` | `void`                     | Store result, evict LRU if at capacity |
| `clear()`         | -                       | `void`                     | Clear all cached entries               |
| `size()`          | -                       | `number`                   | Current number of cached entries       |

---

### RequestDeduplicator (Service/Class)

Manages in-flight request deduplication.

| Property  | Type                          | Description                     |
| --------- | ----------------------------- | ------------------------------- |
| `pending` | `Map<string, PendingRequest>` | Map of key to in-flight request |

**Methods**:

| Method              | Input                      | Output                              | Description                                  |
| ------------------- | -------------------------- | ----------------------------------- | -------------------------------------------- |
| `get(key)`          | `string`                   | `Promise<RouteResult> \| undefined` | Get pending promise if exists                |
| `set(key, request)` | `string`, `PendingRequest` | `void`                              | Register new pending request                 |
| `delete(key)`       | `string`                   | `void`                              | Remove pending request (on completion/error) |
| `cancel(key)`       | `string`                   | `void`                              | Cancel pending request and remove            |
| `cancelAll()`       | -                          | `void`                              | Cancel all pending requests                  |

---

## Relationships

```
useRoutePlanning (composable)
    │
    ├──▶ api-client (service)
    │       │
    │       ├──▶ RequestDeduplicator (class)
    │       │       └── Map<string, PendingRequest>
    │       │
    │       ├──▶ SearchCache (class)
    │       │       └── Map<string, CacheEntry>
    │       │
    │       └──▶ fetch() (native API with AbortController)
    │
    └──▶ useTripInput (composable - unchanged)
```

---

## State Transitions

### Search Request Lifecycle

```
User submits search
    │
    ▼
Generate cache key (normalize origin + destination)
    │
    ├──▶ Cache hit? ──YES──▶ Return cached result
    │
    └──▶ Cache miss
            │
            ▼
    Check pending requests
            │
            ├──▶ Pending exists? ──YES──▶ Return shared promise
            │
            └──▶ No pending
                    │
                    ▼
            Create AbortController
                    │
                    ▼
            Make fetch() request
                    │
            Store in pending
                    │
                    ▼
            On success/error ──▶ Remove from pending
                                    │
                                    ▼
                            On success ──▶ Store in cache
```

### Cache Entry Lifecycle

```
Entry created (timestamp = now)
    │
    ▼
Subsequent get() with same key
    │
    ├──▶ TTL expired? ──YES──▶ Delete entry, return undefined
    │
    └──▶ TTL valid ──▶ Return result, refresh LRU position
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      TripInputForm.vue                       │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Origin Input    │    │ Destination Input               │ │
│  │ (plain text)    │    │ (plain text)                    │ │
│  └────────┬────────┘    └──────────────┬──────────────────┘ │
│           │                            │                    │
│           └────────────┬───────────────┘                    │
│                        │                                    │
│                        ▼                                    │
│               ┌─────────────────┐                           │
│               │  Plan Trip Btn  │                           │
│               │  (explicit CTA) │                           │
│               └────────┬────────┘                           │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  useRoutePlanning    │
              │  (composable)        │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   api-client.ts      │
              │  ┌────────────────┐  │
              │  │ normalizeKey() │  │
              │  └───────┬────────┘  │
              │          ▼            │
              │  ┌────────────────┐   │
              │  │ SearchCache    │   │
              │  │ (LRU + TTL)    │   │
              │  └───────┬────────┘   │
              │          ▼            │
              │  ┌────────────────┐   │
              │  │ RequestDedup   │   │
              │  └───────┬────────┘   │
              │          ▼            │
              │  ┌────────────────┐   │
              │  │ fetch() +      │   │
              │  │ AbortController│   │
              │  └────────────────┘   │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   workers/api        │
              │   (unchanged)        │
              └──────────────────────┘
```

---

## TypeScript Interfaces

```typescript
// Cache entry with TTL metadata
interface CacheEntry<T> {
  result: T
  timestamp: number // Unix timestamp in milliseconds
}

// Pending request for deduplication
interface PendingRequest<T> {
  promise: Promise<T>
  controller: AbortController
}

// Cache configuration
interface CacheConfig {
  maxSize: number // Maximum number of entries (default: 50)
  ttlMs: number // Time-to-live in milliseconds (default: 60000)
}

// Search key components (for normalization)
interface SearchKeyComponents {
  origin: string
  destination: string
}
```

---

## Validation Rules

### Cache Key Normalization

1. Convert to lowercase
2. Trim leading/trailing whitespace
3. Collapse multiple consecutive whitespace characters to single space
4. Join origin and destination with `|` delimiter

Example:

- Input: `origin="  Bangkok  "`, `destination="CHIANG MAI"`
- Normalized: `bangkok|chiang mai`

### TTL Validation

```
isExpired = (now - entry.timestamp) > ttlMs
```

### LRU Eviction

When `cache.size >= maxSize` and new entry added:

1. Find oldest entry (first in Map iteration order)
2. Delete oldest entry
3. Insert new entry

On cache hit:

1. Delete entry from current position
2. Re-insert entry (moves to end = newest)
