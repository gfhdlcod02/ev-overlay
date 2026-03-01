# Contract: Route API (Cloudflare Worker)

**Endpoint**: `GET /api/route`

**Description**: Proxies route requests to OSRM with caching and normalization.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| origin | string | Yes | Origin coordinates as `lat,lng` |
| destination | string | Yes | Destination coordinates as `lat,lng` |

### Example Request

```
GET /api/route?origin=37.7749,-122.4194&destination=34.0522,-118.2437
```

### Validation

- Origin and destination must be valid coordinates (lat: -90 to 90, lng: -180 to 180)
- Returns 400 if parameters missing or invalid

## Response

### Success (200 OK)

```json
{
  "distanceKm": 612.5,
  "durationMin": 350,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-122.4194, 37.7749],
      [-122.418, 37.7755],
      ...
    ]
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_PARAMS | Missing or invalid origin/destination |
| 404 | NO_ROUTE | No route found between points |
| 502 | PROVIDER_ERROR | OSRM service unavailable |
| 504 | TIMEOUT | Request to OSRM timed out |

### Error Body Format

```json
{
  "error": {
    "code": "NO_ROUTE",
    "message": "No route found between the specified locations"
  }
}
```

## Caching

- Successful responses cached in KV for 7 days
- Cache key: `route:{originHash}:{destinationHash}`
- Hash: First 8 chars of SHA-256 of coordinate string (rounded to 4 decimals)

## CORS

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Rate Limiting

- Basic rate limiting applied at Worker level
- Responds with 429 after excessive requests from same IP
