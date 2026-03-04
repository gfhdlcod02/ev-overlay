# Research: Simplify Search Form

**Feature**: Simplify Search Form
**Date**: 2026-03-04
**Researcher**: Claude Code /speckit.plan

---

## Research Areas

### 1. Request Deduplication Patterns

**Decision**: Use a pending request Map with composite keys

**Rationale**:

- Simple, proven pattern for preventing duplicate in-flight requests
- Works well with AbortController for cancellation
- No external dependencies needed

**Implementation approach**:

```typescript
const pendingRequests = new Map<string, Promise<Result>>()
```

- Key: Normalized origin + destination string
- Value: Promise that resolves to the result
- On new request: Check Map, return existing promise if found
- On completion/error: Remove from Map

**Alternatives considered**:

- **RxJS with shareReplay**: Rejected - adds heavy dependency for simple use case
- **TanStack Query (React Query)**: Rejected - Vue integration adds complexity, overkill for single feature
- **Custom EventEmitter**: Rejected - Map with Promises is simpler and more type-safe

---

### 2. LRU Cache Implementation

**Decision**: Implement custom LRU cache with TTL using Map + Doubly-linked list pattern

**Rationale**:

- Map preserves insertion order in ES6+, can use for simple LRU
- For 50 entries max, simple approach is sufficient (no need for complex data structures)
- TTL check on every get() operation

**Implementation approach**:

```typescript
class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize = 50
  private ttlMs = 60000

  get(key: K): V | undefined
  set(key: K, value: V): void
  // Map maintains insertion order; re-insert on access for LRU
}
```

**Alternatives considered**:

- **lru-cache npm package**: Rejected - avoid new dependency for simple cache
- **IndexedDB for persistence**: Rejected - spec requires memory-only cache
- **WeakMap**: Rejected - not iterable, can't implement LRU eviction

---

### 3. Request Cancellation Pattern

**Decision**: Use standard AbortController API

**Rationale**:

- Native browser API, no dependencies
- Works seamlessly with fetch()
- Well-supported in modern browsers (target platform)

**Implementation approach**:

```typescript
const controller = new AbortController()
const response = await fetch(url, { signal: controller.signal })

// Cancel when new search starts
controller.abort()
```

**Edge cases handled**:

- AbortError is expected and should not show user error
- Need to distinguish between user cancellation vs network failure

**Alternatives considered**:

- **Axios cancellation tokens**: Rejected - adds dependency, native fetch is sufficient
- **Manual promise rejection**: Rejected - AbortController is standard and cleaner

---

### 4. Cache Key Normalization

**Decision**: Case-insensitive, trim whitespace, collapse multiple whitespace

**Rationale** (from clarification session):

- Users may type "bangkok" or "Bangkok" - should match
- Leading/trailing whitespace is accidental
- Multiple spaces between words are accidental

**Implementation**:

```typescript
function normalizeSearchKey(origin: string, destination: string): string {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  return `${normalize(origin)}|${normalize(destination)}`
}
```

---

### 5. Vue 3 Composition API Integration

**Decision**: Modify existing composables (`useRoutePlanning`, `api-client`) without changing their public API

**Rationale**:

- Maintains backward compatibility with existing components
- Changes are internal implementation details
- No changes needed to component templates

**Integration points**:

1. `api-client.ts` - Add caching layer internally
2. `useRoutePlanning.ts` - Use cached API client (no signature changes)
3. `TripInputForm.vue` - Already plain text, just verify no autocomplete attributes

---

## Research Summary

| Area            | Decision                         | Key Files                |
| --------------- | -------------------------------- | ------------------------ |
| Request dedup   | Pending request Map              | `api-client.ts`          |
| Caching         | Custom LRU (50 entries, 60s TTL) | `request-cache.ts` (new) |
| Cancellation    | AbortController                  | `api-client.ts`          |
| Normalization   | Lowercase, trim, collapse spaces | `api-client.ts`          |
| Vue integration | Internal changes only            | `useRoutePlanning.ts`    |

**No external dependencies required** - all solutions use native APIs.
