# Feature Specification: Simplify Search Form

**Feature Branch**: `004-simplify-search-form`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Create an implementation spec to update the trip booking/search form: Origin and Destination must be plain text inputs only. Remove all autocomplete/typeahead/auto-suggestion behavior for these two fields. Do not call suggestion/geocoding APIs while typing in Origin or Destination. Trigger search APIs only on explicit user action (Search/Submit), not on input change. Prevent API over-calling by adding request deduplication, short-term cache (TTL), and cancellation of stale requests; use debounce/throttle only where truly needed outside Origin/Destination. Keep current validation and UX unchanged except for removing suggestions on Origin/Destination. Preserve existing API payload contracts unless a change is strictly necessary."

## User Scenarios & Testing

### User Story 1 - Plain Text Origin/Destination Inputs (Priority: P1)

As a user planning an EV trip, I want to enter my origin and destination as plain text without any autocomplete suggestions appearing while I type, so that I have full control over the text I enter and don't get distracted by suggestion dropdowns.

**Why this priority**: This is the core requirement of the feature. Removing autocomplete simplifies the UI and prevents unintended API calls during typing. It gives users full control over their input without interruption.

**Independent Test**: Can be fully tested by typing into Origin and Destination fields and verifying no suggestion dropdowns appear, no network requests are made while typing, and the fields accept any text input.

**Acceptance Scenarios**:

1. **Given** the trip planning form is loaded, **When** I type into the Origin field, **Then** no autocomplete suggestions appear and no API calls are triggered
2. **Given** the trip planning form is loaded, **When** I type into the Destination field, **Then** no autocomplete suggestions appear and no API calls are triggered
3. **Given** I have entered text in both Origin and Destination fields, **When** I click the "Plan Trip" button, **Then** the search API is called with the exact text I entered

---

### User Story 2 - Efficient API Request Management (Priority: P1)

As a system operator, I want API requests to be deduplicated, cached, and cancellable when stale, so that we minimize unnecessary API calls, reduce server load, and provide faster responses for duplicate searches.

**Why this priority**: This addresses the performance and cost requirements. Without this, removing autocomplete could shift the problem to redundant search API calls. This ensures efficient resource usage.

**Independent Test**: Can be tested by triggering the same search multiple times and verifying only one API request is made (deduplication), subsequent identical searches return cached results, and pending requests are cancelled when new searches are initiated.

**Acceptance Scenarios**:

1. **Given** a search for "Bangkok to Chiang Mai" is in progress, **When** I trigger the same search again before it completes, **Then** only one API request is made and both callers receive the same result
2. **Given** I successfully searched for "Bangkok to Chiang Mai" 30 seconds ago, **When** I search for the same route again, **Then** the result is returned from cache without making a new API request
3. **Given** a search is in progress, **When** I modify the search parameters and submit a new search, **Then** the previous pending request is cancelled and a new request is made

---

### User Story 3 - Preserved Validation and User Experience (Priority: P2)

As a user, I want the existing validation behavior and overall UX to remain unchanged (except for the removal of autocomplete), so that I don't experience any regression in the app's usability or error handling.

**Why this priority**: While important for user experience, this is secondary to the core functionality changes. It ensures we don't break existing behavior while making the primary changes.

**Independent Test**: Can be tested by submitting invalid inputs (empty fields, invalid coordinates) and verifying appropriate error messages are shown, and by confirming all existing validation rules still apply.

**Acceptance Scenarios**:

1. **Given** I leave the Origin field empty, **When** I attempt to submit the form, **Then** I see a validation error preventing submission
2. **Given** I enter invalid EV parameters (e.g., negative range), **When** I attempt to submit the form, **Then** I see appropriate validation errors
3. **Given** the geolocation feature is available, **When** I grant location permission, **Then** my current coordinates still auto-populate the Origin field as they did before

---

### Edge Cases

1. **Rapid form submission**: Subsequent clicks while a search is loading are ignored (button disabled state); only the first click triggers the API call
2. **Network failures**: Geocoding or route API failures display an inline error message in the form's error area, allowing the user to correct input and retry
3. **Cache expiration**: When a cached result expires during active use, the next search triggers a fresh API request and updates the cache with the new result
4. **Concurrent different searches**: Simultaneous searches for different routes are handled as separate independent requests with their own deduplication and caching
5. **Browser refresh**: Search state is not preserved across page refreshes; the form resets to its initial state (consistent with current behavior)
6. **Invalid coordinate format**: Malformed coordinate strings are rejected by form validation with an appropriate error message before API submission
7. **Empty/whitespace inputs**: Empty or whitespace-only strings for Origin/Destination are blocked by form validation with a required field error

## Requirements

### Functional Requirements

- **FR-001**: The Origin input field MUST be a plain text input with no autocomplete, typeahead, or suggestion behavior
- **FR-002**: The Destination input field MUST be a plain text input with no autocomplete, typeahead, or suggestion behavior
- **FR-003**: No geocoding or suggestion APIs MUST be called while typing in Origin or Destination fields
- **FR-004**: Search APIs MUST only be triggered on explicit user action (clicking "Plan Trip" button or pressing Enter in form); subsequent clicks while loading are ignored
- **FR-005**: The system MUST implement request deduplication - if an identical search request is already in-flight, new requests MUST reuse the pending promise instead of creating a new API call; "identical" means same normalized origin and destination (case-insensitive, trimmed, collapsed whitespace)
- **FR-006**: The system MUST implement short-term caching with TTL (60 seconds) and LRU eviction (max 50 entries) for search results to prevent redundant API calls; cache keys use normalized origin and destination (case-insensitive, trimmed, collapsed whitespace)
- **FR-007**: The system MUST cancel stale in-flight requests when a new search is initiated
- **FR-008**: Existing form input validation rules MUST remain unchanged (required fields, valid EV parameters); this refers to input format validation only, not output estimates
- **FR-009**: Existing geolocation auto-populate behavior for Origin field MUST remain unchanged
- **FR-010**: Existing API payload contracts MUST be preserved (no changes to request/response formats)
- **FR-011**: API failures (geocoding or route API) MUST display inline error messages in the form's error area, allowing users to correct input and retry

### Key Entities

- **TripInput**: User's search parameters including origin (string), destination (string), and EV parameters
- **SearchRequest**: Internal representation of a search operation with origin and destination identifiers
- **CacheEntry**: Stored search result with timestamp and TTL for short-term caching; cache key is normalized (case-insensitive, trimmed, collapsed whitespace) origin + destination
- **PendingRequest**: In-flight API request tracking for deduplication purposes

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can type freely in Origin and Destination fields without any UI interruptions from suggestions
- **SC-002**: Zero API calls are made during text input in Origin/Destination fields
- **SC-003**: Identical search requests submitted within 5 seconds of each other result in only one API call (deduplication)
- **SC-004**: Search results for identical queries are returned from cache within the TTL window (no network request)
- **SC-005**: All existing validation error scenarios continue to work as before
- **SC-006**: Geolocation auto-populate continues to work for Origin field when permission is granted

## Clarifications

### Session 2026-03-04

- **Q**: What should the cache TTL be for search results? → **A**: 60 seconds (Option B) - Balanced approach for route caching
- **Q**: Should there be a maximum number of cached entries, and what eviction strategy? → **A**: LRU eviction with 50 entries (Option A)
- **Q**: How should search requests be normalized to determine if they are identical? → **A**: Case-insensitive, trimmed, collapsed whitespace (Option B)
- **Q**: What should happen when a user rapidly clicks the "Plan Trip" button multiple times? → **A**: Ignore subsequent clicks while loading (Option A)
- **Q**: How should the system handle geocoding or route API failures? → **A**: Show inline error message (Option B)

## Assumptions

1. **Cache TTL**: 60 seconds (confirmed via clarification) - Balanced approach for route caching, catches users re-searching same route while adjusting EV parameters without stale route data persisting too long
2. **Cache size limit**: Maximum 50 entries with LRU (Least Recently Used) eviction when limit reached (confirmed via clarification)
3. **Deduplication window**: Requests are considered "in-flight" until they complete or are cancelled
4. **Cache storage**: Client-side memory cache is sufficient (no persistence needed across sessions)
5. **Cache key**: Search cache key is based on normalized (case-insensitive, trimmed, collapsed whitespace) origin + destination strings (confirmed via clarification). "Collapsed whitespace" means multiple consecutive spaces/tabs/newlines are reduced to a single space.
6. **Request cancellation**: Uses standard AbortController API for cancellable fetch requests
7. **No server-side changes**: All changes are client-side; API endpoints remain unchanged
