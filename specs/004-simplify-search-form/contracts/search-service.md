# Contract: Search Service (Internal API)

**Status**: UNCHANGED - Existing contract preserved per FR-010
**Feature**: Simplify Search Form
**Date**: 2026-03-04

---

## Overview

This document describes the internal API contract between the web frontend (`apps/web`) and the API worker (`workers/api`). **No changes are being made to this contract** as part of the Simplify Search Form feature.

The web app will continue to call the existing endpoints; only the client-side request management is being enhanced.

---

## Endpoints

### GET /api/route

**Purpose**: Retrieve route information between origin and destination

**Request**:

```http
GET /api/route?origin={origin}&destination={destination}
Accept: application/json
```

**Query Parameters**:

| Parameter     | Type   | Required | Description                                           |
| ------------- | ------ | -------- | ----------------------------------------------------- |
| `origin`      | string | Yes      | Origin coordinates ("lat,lng") or address string      |
| `destination` | string | Yes      | Destination coordinates ("lat,lng") or address string |

**Response** (200 OK):

```json
{
  "route": {
    "origin": { "lat": 13.7563, "lng": 100.5018, "address": "Bangkok" },
    "destination": { "lat": 18.7883, "lng": 98.9853, "address": "Chiang Mai" },
    "distanceKm": 685.5,
    "durationMin": 420,
    "polyline": "encoded_polyline_string",
    "legs": [...]
  }
}
```

**Error Responses**:

- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: Route not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Could not calculate route between specified points"
  }
}
```

---

### GET /api/version

**Purpose**: Retrieve current API version (for diagnostics)

**Request**:

```http
GET /api/version
Accept: application/json
```

**Response** (200 OK):

```json
{
  "version": "1.2.0",
  "commit": "abc1234"
}
```

---

## External: Nominatim Geocoding

**Purpose**: Geocode address strings to coordinates

**Endpoint**: `https://nominatim.openstreetmap.org/search`

**Request**:

```http
GET https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=1
User-Agent: EV-Overlay/1.0
```

**Query Parameters**:

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `format`  | string | Yes      | Response format (always "json") |
| `q`       | string | Yes      | Search query (address)          |
| `limit`   | number | No       | Max results (default: 1)        |

**Response** (200 OK):

```json
[
  {
    "place_id": 12345,
    "lat": "13.7563",
    "lon": "100.5018",
    "display_name": "Bangkok, Thailand",
    "type": "city"
  }
]
```

**Notes**:

- No API key required (OpenStreetMap public API)
- Rate limiting applies (1 request per second recommended)
- User-Agent header is required

---

## Caching Behavior

### Server-Side (Cloudflare KV)

- Routes are cached in KV with 7-day TTL
- Cache key derived from normalized coordinates
- No changes as part of this feature

### Client-Side (New in this feature)

- Search results cached in memory with 60s TTL
- Max 50 entries with LRU eviction
- Deduplication of in-flight requests
- Cancellation via AbortController

---

## Error Handling

### Network Errors

- Timeout: 10 seconds
- Retry: No automatic retry (fail fast)
- User message: "Service Error: Cannot connect to API server. Please ensure the API is running."

### HTTP Errors

- Non-JSON response handled gracefully
- Specific error codes mapped to user-friendly messages
- All errors displayed inline in form error area

---

## Security Considerations

- No API keys exposed to client (worker handles secrets)
- Origin/destination logged minimally (privacy per Constitution IV)
- CORS enforced at worker level
- Rate limiting enforced at worker level (60 req/min per IP)
