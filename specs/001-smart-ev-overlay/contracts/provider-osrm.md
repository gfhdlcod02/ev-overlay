# Contract: OSRM Provider Normalization

**Provider**: Open Source Routing Machine (OSRM)
**Endpoint**: `https://router.project-osrm.org/route/v1/driving/{coordinates}`

## OSRM Request Format

```
GET https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson
```

### Parameters

| Parameter   | Value                     | Description                                                    |
| ----------- | ------------------------- | -------------------------------------------------------------- |
| coordinates | `{lng},{lat};{lng},{lat}` | Semicolon-separated coordinate pairs (OSRM uses lng,lat order) |
| overview    | `full`                    | Return full geometry                                           |
| geometries  | `geojson`                 | Return geometry as GeoJSON                                     |

## OSRM Response Format

```json
{
  "code": "Ok",
  "routes": [
    {
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], [lng, lat], ...]
      },
      "legs": [...],
      "distance": 612500,
      "duration": 21000,
      "weight": 21000,
      "weight_name": "duration"
    }
  ],
  "waypoints": [...]
}
```

## Normalization Rules

### Units Conversion

| OSRM Field           | Internal Field | Conversion |
| -------------------- | -------------- | ---------- |
| `distance` (meters)  | `distanceKm`   | ÷ 1000     |
| `duration` (seconds) | `durationMin`  | ÷ 60       |

### Geometry Preservation

- OSRM returns GeoJSON LineString directly
- Coordinate order: [lng, lat] (preserved from OSRM)
- Leaflet expects [lat, lng] - transformation happens in UI layer

### Error Normalization

| OSRM Code        | HTTP Status | Internal Error Code |
| ---------------- | ----------- | ------------------- |
| `Ok`             | 200         | -                   |
| `NoRoute`        | 404         | `NO_ROUTE`          |
| `NotImplemented` | 501         | `PROVIDER_ERROR`    |
| (timeout)        | 504         | `TIMEOUT`           |

### Normalization Algorithm

```typescript
function normalizeOSRMResponse(osrm: OSRMResponse): Route {
  if (osrm.code !== 'Ok' || !osrm.routes?.length) {
    throw new ProviderError(osrm.code)
  }

  const route = osrm.routes[0]

  return {
    distanceKm: Math.round((route.distance / 100) * 10) / 10, // 1 decimal
    durationMin: Math.ceil(route.duration / 60), // Round up
    geometry: route.geometry,
  }
}
```

## Timeout Configuration

- Connection timeout: 5 seconds
- Total request timeout: 10 seconds
- Retries: 1 retry on timeout (2 total attempts)

## Response Size Limits

- Maximum geometry points: 10,000 (simplify if exceeded)
- Maximum response size: 1MB
