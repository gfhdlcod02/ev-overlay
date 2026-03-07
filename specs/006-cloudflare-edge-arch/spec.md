# Feature Specification: Cloudflare Edge-Native Re-architecture

**Feature Branch**: `006-cloudflare-edge-arch`
**Created**: 2026-03-07
**Status**: DEPLOYMENT COMPLETE
**Input**: User description: "Re-architecture EV Overlay to Cloudflare edge-native architecture: Frontend: Vue 3 SPA on Cloudflare Pages, API: Worker as edge gateway for /api/*, Data: D1 as source of truth for charging stations + metadata, Cache: KV for hot read cache (routes, station query snapshots), Concurrency control: Durable Object for rate limiting and ingest locks, Ingestion: Queues + Worker Consumer to fetch OpenChargeMap, normalize, upsert D1, refresh KV, write snapshots to R2, External providers: Google Maps APIs (Directions/Routes) and OpenChargeMap API, Keep current API compatibility where possible during migration, Migrate incrementally with phases and rollback-safe cutover"

**Phase Status**:
- ✅ Phase 1 (Setup): 15/15 Complete - Infrastructure created and configured
- ✅ Phase 2 (Foundational): 9/9 Complete - D1 schema and repositories operational
- ✅ Phase 3 (US1: Route Planning): 10/10 Complete - Route API with KV caching
- ✅ Phase 4 (US2: Data Ingestion): 15/15 Complete - OCM integration and queue processing
- ✅ Phase 5 (US3: Migration): 13/14 Complete - Shadow traffic complete, cutover executed
- ✅ Phase 6 (US4: Rate Limiting): 7/7 Complete - Dashboard implemented
- ✅ Phase 7 (US5: Performance): 11/11 Complete - All dashboards and alerts implemented
- ✅ Phase 8 (Polish): 21/21 Complete - All tasks complete

**Overall Status**: ✅ **DEPLOYMENT COMPLETE** (101/102 tasks)
- **Live Traffic**: 100% routing to new infrastructure
- **Shadow Traffic**: Completed 1% → 50% ramp
- **Cutover**: Executed 2026-03-09
- **Standby**: T063 (30-day old infrastructure standby until 2026-04-08)

## Overview

This specification defines the migration of EV Overlay from its current architecture to a fully edge-native architecture on Cloudflare's platform. The goal is to improve global performance, reduce operational complexity, and create a more scalable foundation for future features while maintaining full compatibility with existing user workflows.

## User Scenarios & Testing

### User Story 1 - Seamless Route Planning Experience (Priority: P1)

As an EV driver planning a trip, I want to enter my origin and destination and receive optimized charging stop recommendations instantly, regardless of my location or time of day.

**Why this priority**: Route planning is the core value proposition of EV Overlay. Any architectural changes must not degrade, and should ideally improve, this primary user experience.

**Independent Test**: Can be fully tested by planning routes between various locations and verifying charging stops are calculated correctly and returned within acceptable time limits.

**Acceptance Scenarios**:

1. **Given** a user enters origin "Bangkok" and destination "Chiang Mai" with valid EV parameters, **When** they submit the route request, **Then** the system returns a complete route with charging stops within 3 seconds
2. **Given** a user plans the same route twice within a short timeframe, **When** they submit the second request, **Then** results are returned within 1 second (cached)
3. **Given** a user accesses the application from different geographic regions, **When** they plan a route, **Then** response times remain consistently fast (under 3 seconds)

---

### User Story 2 - Up-to-Date Charging Station Data (Priority: P1)

As an EV driver relying on the application for trip planning, I want charging station information to be current and accurate so I can trust the recommendations for my journey.

**Why this priority**: Data freshness directly impacts user trust and safety. Outdated station information could lead to stranded users.

**Independent Test**: Can be fully tested by verifying that new charging stations from external data sources appear in route calculations within a reasonable timeframe after being added to the source system.

**Acceptance Scenarios**:

1. **Given** OpenChargeMap adds a new charging station in Thailand, **When** the data ingestion process completes, **Then** the station appears in route planning results within 24 hours
2. **Given** a charging station updates its availability or connector information, **When** the next data sync occurs, **Then** the updated information is reflected in route calculations
3. **Given** the data ingestion pipeline runs, **When** processing completes, **Then** all changes are tracked with timestamps for audit purposes

---

### User Story 3 - Migration Without Service Disruption (Priority: P1)

As a regular user of EV Overlay, I want the application to remain available and functional throughout the infrastructure migration without requiring any action from me.

**Why this priority**: Zero-downtime migration is critical for maintaining user trust and preventing churn during the transition period.

**Independent Test**: Can be fully tested by continuously monitoring application availability and functionality during each migration phase.

**Acceptance Scenarios**:

1. **Given** the migration is in progress, **When** users access the application, **Then** they experience no service interruption
2. **Given** a rollback is required during migration, **When** the rollback executes, **Then** users are seamlessly directed to the previous working version
3. **Given** the migration completes a phase, **When** users interact with the application, **Then** all existing features continue to work identically to before

---

### User Story 4 - Fair Resource Usage for All Users (Priority: P2)

As a user of EV Overlay, I want the application to remain responsive even during periods of high demand from other users.

**Why this priority**: Fair resource allocation ensures consistent experience and prevents abuse that could degrade service for others.

**Independent Test**: Can be fully tested by simulating high concurrent usage and verifying that rate limits are enforced without breaking legitimate user workflows.

**Acceptance Scenarios**:

1. **Given** a user makes normal route planning requests, **When** they stay within usage limits, **Then** all requests succeed without throttling
2. **Given** excessive requests come from a single source, **When** the rate limit is exceeded, **Then** subsequent requests receive a clear message explaining the limit
3. **Given** rate limits are applied, **When** the limit period expires, **Then** normal service resumes automatically

---

### User Story 5 - Global Accessibility and Performance (Priority: P2)

As an international traveler or user in different regions, I want the application to load quickly and function reliably regardless of my geographic location.

**Why this priority**: Edge-native architecture should deliver on its promise of global low-latency performance.

**Independent Test**: Can be fully tested by accessing the application from different geographic locations and measuring load times and functionality.

**Acceptance Scenarios**:

1. **Given** a user accesses the application from Asia, Europe, and North America, **When** the page loads, **Then** initial load time is under 2 seconds in all regions
2. **Given** a user interacts with the map and planning features, **When** they perform actions, **Then** API responses meet p95 < 2s and p99 < 3s latency targets from all major regions (Asia, Europe, Americas)
3. **Given** network conditions vary, **When** users access the application, **Then** the experience gracefully adapts to available bandwidth

### Edge Cases

**Note**: Handling strategies for all edge cases are documented in [plan.md](./plan.md) Edge Case Handling table.

- What happens when the external data provider (OpenChargeMap) is unavailable during scheduled ingestion?
- How does the system handle concurrent route requests from thousands of users during a traffic spike?
- What happens when a Durable Object holding rate limit state becomes unavailable?
- How does the system respond if the primary database is temporarily unreachable during a read request?
- What happens when a data ingestion job partially fails, leaving some records updated and others not?
- How are API version compatibility issues handled during the migration cutover?

## Requirements

### Functional Requirements

- **FR-001**: The system MUST serve the frontend application from edge locations close to users, ensuring fast initial page loads globally
- **FR-002**: The system MUST route API requests through a unified edge gateway that handles all /api/* endpoints
- **FR-003**: The system MUST store charging station data as the authoritative source of truth, including location, connector types, power ratings, availability status, and metadata
- **FR-004**: The system MUST cache frequently accessed data (route calculations and station query results) for fast retrieval
- **FR-005**: The system MUST implement rate limiting to prevent abuse and ensure fair resource allocation across all users (thresholds: 100 req/hour for route planning, 300 req/hour for station queries)
- **FR-006**: The system MUST fetch, normalize, and ingest charging station data from external providers on a scheduled basis
- **FR-007**: The system MUST maintain data consistency during concurrent ingestion operations through proper locking mechanisms
- **FR-008**: The system MUST write historical snapshots of charging station data for analytics and audit purposes
- **FR-009**: The system MUST calculate routes using external mapping services while applying EV-specific logic for charging stops
- **FR-010**: The system MUST support a three-phase migration: Phase 1 - Infrastructure setup (D1 schema, KV namespaces, Durable Objects), Phase 2 - Shadow traffic validation (dual-write, compare responses), Phase 3 - Gradual traffic cutover with rollback capability at each step
- **FR-011**: The system MUST maintain backward compatibility with existing API contracts during the migration period
- **FR-012**: The system MUST process data ingestion jobs asynchronously through a queue system to handle variable load
- **FR-013**: The system MUST emit application metrics for key operational indicators including request latency, error rates, cache hit rates, and ingestion job success/failure rates
- **FR-014**: The system MUST log errors with sufficient context for debugging, including request identifiers and relevant entity IDs
- **FR-015**: The system MUST provide alerts for critical failures including: data ingestion pipeline failures, database connectivity issues, and external API failures affecting core functionality

### Key Entities

- **ChargingStation**: Represents a physical charging location with attributes including geographic coordinates, connector types, power output, availability status, operator information, and operational hours
- **Route**: Represents a planned journey between two points with waypoints, calculated distance, estimated travel time, and recommended charging stops
- **ChargingStop**: Represents a recommended stop along a route including the station reference, estimated charge time, and battery levels at arrival/departure
- **RouteRequest**: Represents a user's route planning input including origin, destination, vehicle parameters (battery capacity, consumption rate, current charge), and routing preferences
- **IngestionJob**: Represents a data synchronization task from external providers including job status, timestamps, records processed, and any errors encountered
- **RateLimitBucket**: Represents rate limiting state for a client including request counts, window start time, and current limit status

### Data Retention & Compliance

- **DR-001**: Route calculation cache entries MUST expire after 7 days to ensure freshness (per SC-003 cache hit target)
- **DR-002**: Historical charging station snapshots MUST be retained for audit and analytics purposes (default: 90 days)
- **DR-003**: Rate limiting state MUST be transient and not persist longer than the enforcement window (default: 1 hour)
- **DR-004**: User location data (if collected) MUST NOT be stored persistently and SHOULD only exist for the duration of the route request

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users in major global regions (Asia, Europe, Americas) experience initial page load times under 2 seconds (p95)
- **SC-002**: Route planning requests return results within 3 seconds for 95% of requests under normal load
- **SC-003**: Cached route results are served within 1 second for 99% of identical repeat queries
- **SC-004**: Charging station data is synchronized from external sources within 24 hours of source updates
- **SC-005**: The system handles 10,000 simultaneous active connections without performance degradation or error rate increases (see Load Definitions for relationship to req/sec)
- **SC-006**: API compatibility is maintained at 100% - all existing client integrations continue to function without modification
- **SC-007**: Zero unplanned downtime during migration phases (excluding scheduled maintenance windows with advance notice)
- **SC-008**: Rollback to previous architecture can be completed within 15 minutes of decision
- **SC-009**: Rate limiting prevents abuse while allowing legitimate users to complete at least 100 route planning requests per hour
- **SC-010**: Data ingestion processes complete successfully for 99.5% of scheduled jobs without manual intervention

## Assumptions

- External API providers (Google Maps, OpenChargeMap) maintain their current service levels and API contracts
- Cloudflare services (Workers, D1, KV, Durable Objects, Queues, Pages) maintain their published SLAs
- The current user base growth rate remains within expected bounds (under 10x current load)
- Data ingestion from OpenChargeMap follows a standard REST API pattern with reasonable rate limits
- Migration can occur in phases without requiring simultaneous changes to all system components
- The charging station dataset scales to approximately 10,000 stations with fewer than 1,000 daily record changes, primarily focused on Thailand coverage

**Load Definitions**:
- **Concurrent users**: Users with active requests in flight at the same moment (not cumulative per minute/hour)
- **Request rate assumption**: 10 req/min per active user (route planning + station queries)
- **Simultaneous connections**: 10,000 active connections (defined as requests in-flight or WebSocket connected) per SC-005
- **Peak capacity target**: ~1,600 req/sec sustained (10,000 users × 10 req/min ÷ 60), 3,000 req/sec burst

## Dependencies

- Cloudflare account with access to Workers, D1, KV, Durable Objects, Queues, R2, and Pages services
- OpenChargeMap API access with sufficient rate limits for scheduled data synchronization
- Google Maps API credentials with Routes/Directions API enabled
- Existing EV Overlay functionality as the baseline for compatibility testing
- CI/CD pipeline capable of deploying to Cloudflare services

## Out of Scope

- User authentication and authorization systems (system remains anonymous/public access)
- Payment processing or premium tier features
- Real-time charging station availability updates (polling-based updates only)

**Note on Scope Boundary**: US2's charging station data ingestion is foundational (Phase 1) infrastructure work that enables future Phase 2 "Charger POI suggestions" per the constitution, not a Phase 2+ feature itself. Real-time availability (websocket/push updates) remains out of scope; this work provides the data foundation for static POI display only.
- Mobile native applications (web-only deployment)
- Machine learning-based route optimization (current algorithm is maintained)
- Multi-language support beyond current offerings

## Clarifications

### Session 2026-03-07

- **Q**: What level of observability is required for production operations? → **A**: Standard - Application metrics, error tracking, key metric dashboards, PagerDuty/Slack alerts for critical failures
- **Q**: What is the expected data volume for charging stations and daily ingestion load? → **A**: Thailand-scale - ~10,000 stations, <1,000 daily changes, primarily Thailand coverage
- **Q**: How many migration phases should be defined, and what is the cutover strategy? → **A**: Three-phase - Phase 1: Infra setup (D1, KV, DO), Phase 2: Shadow traffic validation, Phase 3: Gradual traffic cutover with rollback at each step
