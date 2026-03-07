# Phase 2 Proposal: Charger POI Suggestions

**Status**: Proposal - Pending Phase 1 completion (T063)
**Priority**: P2 (Post-MVP)
**Estimated Effort**: 2-3 sprints

---

## Overview

Replace virtual charging stops with actual charger locations from D1 database. This builds on the data foundation established in US2 (OpenChargeMap ingestion).

---

## User Story

**As an** EV driver
**I want** route planning that uses actual charging station locations
**So that** I can navigate to real chargers, not estimated positions

---

## Acceptance Criteria

1. Route algorithm queries D1 for chargers within range corridor
2. Charging stops include station name, address, connector types
3. "Open in Google Maps" uses actual station coordinates
4. Filter by: connector type (CCS, CHAdeMO), min power (50kW+)
5. Fallback to virtual stops if no real chargers available

---

## Technical Approach

### Route Planning Enhancement
```typescript
// New: Query actual stations from D1
const stations = await stationRepo.findWithinCorridor({
  routeGeometry: route.geometry,
  bufferKm: 10,  // Search within 10km of route
  minPowerKw: 50,
  connectorTypes: ['CCS'],
});

// Use real stations for stop placement
const stops = calculateStopsWithRealStations(route, stations, safeRange);
```

### API Changes
- `GET /api/v1/stations/corridor` - Query stations near route
- Extend `RouteResponse` with `stationDetails` array

### Database Query
```sql
-- Spatial query using D1's R-Tree index
SELECT * FROM charging_stations
WHERE latitude BETWEEN ? AND ?
  AND longitude BETWEEN ? AND ?
  AND EXISTS (
    SELECT 1 FROM station_connectors
    WHERE station_id = charging_stations.id
      AND power_kw >= ?
      AND connector_type IN (...)
  );
```

---

## Tasks (Draft)

| ID | Task | Estimate |
|----|------|----------|
| P2-T1 | Spatial corridor query in D1 | 3d |
| P2-T2 | Route stop placement with real stations | 5d |
| P2-T3 | Filter UI (connector type, power) | 2d |
| P2-T4 | Station detail modal component | 3d |
| P2-T5 | Fallback logic (virtual → real → virtual) | 2d |
| P2-T6 | E2E tests for POI flow | 3d |

---

## Constitution Compliance

- ✅ **Phase-Gated**: Waits for Phase 1 completion
- ✅ **Safety-First**: Maintains virtual stop fallback
- ✅ **Deterministic**: No ML, spatial math only
- ✅ **Cloudflare-First**: Uses existing D1 + Workers

---

**Decision**: Approve for development after T063 decommissioning?
