# API Contracts

**Date**: 2026-03-07

## Endpoints

### Route Planning

**Endpoint**: `POST /api/v1/routes`

Calculate a route with EV charging stops.

#### Request

```typescript
interface RouteRequest {
  origin: {
    name?: string;           // "Bangkok"
    lat: number;             // 13.7563
    lng: number;             // 100.5018
  };
  destination: {
    name?: string;           // "Chiang Mai"
    lat: number;             // 18.7883
    lng: number;             // 98.9853
  };
  vehicle: {
    batteryCapacityKwh: number;  // e.g., 77.4 (Ioniq 5)
    rangeKmAt100Percent: number; // e.g., 450
    currentSocPercent: number;   // 0-100
    reserveSocPercent?: number;  // default: 20
    bufferKm?: number;           // default: 10
    drivingFactor?: number;      // default: 1.0
  };
  preferences?: {
    maxChargingStops?: number;   // default: 5
    chargeToPercent?: number;    // default: 80
    connectorTypes?: string[];   // ["CCS", "CHAdeMO"]
  };
}
```

#### Response (200 OK)

```typescript
interface RouteResponse {
  route: {
    distance: number;        // Total distance in meters
    duration: number;        // Total duration in seconds
    polyline: string;        // Encoded Google Maps polyline
    legs: RouteLeg[];
  };
  chargingStops: ChargingStop[];
  safeRangeKm: number;       // Calculated safe range for this trip
  warnings?: string[];       // e.g., "No charging stations near destination"
}

interface RouteLeg {
  from: LocationPoint;
  to: LocationPoint;
  distance: number;
  duration: number;
  consumptionKwh: number;    // Estimated kWh used
}

interface ChargingStop {
  station: StationSummary;
  arrivalSoc: number;        // % battery on arrival
  departureSoc: number;      // % battery on departure
  chargeDurationMinutes: number;
  legIndex: number;          // Which route leg this stop is after
}

interface StationSummary {
  id: number;
  name: string;
  lat: number;
  lng: number;
  operator?: string;
  connectors: ConnectorInfo[];
}

interface ConnectorInfo {
  type: string;              // "CCS", "CHAdeMO", "Type2"
  powerKw: number;
  status: "available" | "occupied" | "unknown";
}

interface LocationPoint {
  name?: string;
  lat: number;
  lng: number;
}
```

#### Error Responses

```typescript
// 400 Bad Request
{
  error: "INVALID_REQUEST",
  message: "Origin and destination are required",
  details?: { field: string; issue: string }[]
}

// 429 Too Many Requests
{
  error: "RATE_LIMITED",
  message: "Too many requests",
  retryAfter: 3600  // seconds
}

// 500 Internal Server Error
{
  error: "ROUTE_CALCULATION_FAILED",
  message: "Unable to calculate route",
  requestId: "uuid-for-debugging"
}
```

### Charging Stations Query

**Endpoint**: `GET /api/v1/stations`

Query charging stations within a geographic bounding box.

#### Request

```typescript
interface StationsQuery {
  lat1: number;              // South latitude
  lng1: number;              // West longitude
  lat2: number;              // North latitude
  lng2: number;              // East longitude
  connectorType?: string;    // Filter by connector
  minPowerKw?: number;       // Filter by minimum power
  limit?: number;            // Max results (default: 100, max: 500)
  offset?: number;           // Pagination offset
}
```

#### Response (200 OK)

```typescript
interface StationsResponse {
  stations: StationDetail[];
  total: number;
  limit: number;
  offset: number;
}

interface StationDetail {
  id: number;
  externalId: string;
  name: string;
  operator?: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  status: "operational" | "closed" | "planned";
  connectors: ConnectorDetail[];
  lastUpdated: string;       // ISO timestamp
}

interface ConnectorDetail {
  id: number;
  type: string;
  powerKw: number;
  voltage?: number;
  amperage?: number;
  status: "available" | "occupied" | "out_of_order";
  quantity: number;
}
```

### Single Station

**Endpoint**: `GET /api/v1/stations/:id`

Get details for a specific charging station.

#### Response (200 OK)

```typescript
interface StationResponse {
  station: StationDetail;
}
```

#### Error Responses

```typescript
// 404 Not Found
{
  error: "STATION_NOT_FOUND",
  message: "Station with ID 12345 not found"
}
```

### Health Check

**Endpoint**: `GET /api/health`

Health check for load balancers and monitoring.

#### Response (200 OK)

```typescript
interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: "ok" | "error";
    cache: "ok" | "error";
    externalApis?: "ok" | "degraded" | "error";
  };
}
```

### Version

**Endpoint**: `GET /api/version`

Get API version and deployment info.

#### Response (200 OK)

```typescript
interface VersionResponse {
  version: string;           // "1.2.0"
  commit: string;            // "abc1234"
  deployedAt: string;        // ISO timestamp
  environment: "production" | "staging" | "development";
}
```

## Rate Limiting

- **Route planning**: 100 requests/hour per IP
- **Station queries**: 300 requests/hour per IP
- **Other endpoints**: 600 requests/hour per IP

Rate limit headers included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709836800
```

## Caching

- Route responses: Cached in KV for 7 days (identical requests)
- Station queries: Cached in KV for 1 hour
- Single station: Cached in KV for 1 hour

Cache headers:

```http
Cache-Control: public, max-age=3600
X-Cache: HIT  # or MISS
```

## Backward Compatibility

During migration:
- API contracts remain unchanged from existing implementation
- New D1-based endpoints available at `/api/v1/...`
- Old endpoints proxy to new implementation
- 30-day deprecation window after full cutover

## WebSocket (Future)

Not in current scope. Future consideration for real-time availability.
