# Feature Specification: Smart EV Overlay for Google Maps

**Feature Branch**: `001-smart-ev-overlay`

**Created**: 2026-02-28
**Completed**: 2026-03-01
**Deployed**: [https://fc6ea9ab.ev-overlay.pages.dev](https://fc6ea9ab.ev-overlay.pages.dev)

**Status**: ✅ Complete

**Input**: User description: "Smart EV Overlay for Google Maps - MVP Phase"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Plan EV Trip with Route Visualization (Priority: P1)

As an EV driver planning a trip, I want to enter my origin, destination, and current battery status so that I can see my route with visual indicators of safe driving range and necessary charging stops.

**Why this priority**: This is the core value proposition of the application. Without the ability to visualize safe range and charging needs, users cannot make informed decisions about their EV trips.

**Independent Test**: Can be fully tested by entering a trip from City A to City B with EV parameters and seeing the route rendered with safe (green) and risky (red) segments, plus any suggested charging stops.

**Acceptance Scenarios**:

1. **Given** I am on the trip planning page, **When** I enter origin "San Francisco, CA", destination "Los Angeles, CA", current charge of 80%, range of 400km on full charge, and select "Highway" driving mode, **Then** the system displays the route with distance, estimated duration, and colored segments showing safe vs risky portions.

2. **Given** I have entered trip parameters, **When** the calculated safe range is less than the total trip distance, **Then** the system places virtual charging stops along the route and displays them as markers on the map.

3. **Given** the route visualization is displayed, **When** I click on a charging stop marker, **Then** I see a tooltip with information about that stop.

---

### User Story 2 - Calculate Safe Driving Range (Priority: P1)

As an EV driver, I want the system to calculate my conservative safe driving range based on my current charge and driving conditions so that I can avoid running out of battery.

**Why this priority**: Accurate range calculation is critical for EV drivers to avoid range anxiety and ensure safe arrival. This is a foundational capability that other features depend on.

**Independent Test**: Can be fully tested by inputting various EV parameters (current charge, reserve percentage, driving factor) and verifying the safe range calculation matches expected outcomes.

**Acceptance Scenarios**:

1. **Given** I have 70% current charge, 20% reserve arrival setting, 450km range at 100%, and select "Normal" driving factor (1.15), **When** I calculate my safe range, **Then** the system shows approximately 196km safe range ((70-20)/100 \* 450/1.15).

2. **Given** my current charge is at or below my reserve arrival percentage (e.g., 15% charge with 20% reserve), **When** I attempt to calculate range, **Then** the system displays an error stating I need to charge before planning this trip.

3. **Given** I select different driving modes (Eco, Normal, Highway), **When** the safe range is calculated, **Then** the results reflect the appropriate consumption factors for each mode.

---

### User Story 3 - Navigate with Charging Stops in Google Maps (Priority: P2)

As an EV driver, I want to open my planned route in Google Maps with all charging stops included as waypoints so that I can navigate turn-by-turn with my EV-optimized route.

**Why this priority**: While the app provides planning value, the actual navigation happens in Google Maps. This handoff bridges the planning phase with execution, delivering end-to-end value.

**Independent Test**: Can be fully tested by clicking "Open in Google Maps" and verifying that Google Maps opens with the correct origin, destination, and all charging stops as waypoints.

**Acceptance Scenarios**:

1. **Given** I have a planned route with 2 charging stops, **When** I click the "Open in Google Maps" button, **Then** Google Maps opens in a new tab with the origin, destination, and both charging stops as waypoints in the correct order.

2. **Given** I have a planned route with no charging stops needed, **When** I click "Open in Google Maps", **Then** Google Maps opens with just the origin and destination, no waypoints.

3. **Given** I am on a mobile device, **When** I click "Open in Google Maps", **Then** the link opens the Google Maps app if installed, or the web version if not.

---

### User Story 4 - Cache Route Data for Performance (Priority: P3)

As a user, I want route calculations to be fast when I plan the same or similar trips so that I don't have to wait for the same data to be fetched repeatedly.

**Why this priority**: Performance improves user experience but the app functions without caching. This is an optimization that enhances usability.

**Independent Test**: Can be fully tested by requesting the same route twice and verifying the second request returns faster due to cached data.

**Acceptance Scenarios**:

1. **Given** I request a route from A to B for the first time, **When** the route is fetched, **Then** the data is stored in cache for 7 days.

2. **Given** I request the same route within 7 days, **When** the system processes my request, **Then** the cached route data is returned without fetching fresh data.

---

### Edge Cases

- **Insufficient charge for any travel**: When current charge is at or below reserve percentage, the system must clearly communicate the user needs to charge first.

- **Route exceeds maximum stops**: When a route would require more than 5 charging stops, the system should indicate the destination may not be reachable with current parameters.

- **Very short trips**: When the trip distance is less than the safe range, no charging stops should be suggested.

- **Invalid locations**: When origin or destination cannot be geocoded or no route exists between them, the system should display a clear error message.

- **Network failures**: When the route API is unavailable, the system should display an appropriate error state with retry option.

- **Mobile viewport**: On small screens, the map and controls should remain usable with appropriate touch targets.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept trip input parameters including origin location, destination location, current state of charge percentage, vehicle range at 100% charge, reserve arrival percentage, and driving efficiency factor. Location inputs MUST support both free-text addresses and lat/lng coordinates in decimal degrees format (e.g., "37.7749,-122.4194" or "37.7749, -122.4194" with optional whitespace).

- **FR-001a**: System MUST validate all numeric inputs with the following bounds: state of charge must be 0-100%, reserve arrival must be 0-50%, range at 100% must be greater than 0 km, driving factor must be >= 1.0. Invalid inputs must display clear error messages.

- **FR-002**: System MUST calculate a conservative safe driving range using the formula: `safeRangeKm = ((socNow - reserveArrival)/100) * (range100Km / factor)` with a default 10km buffer applied to stop placement decisions.

- **FR-003**: System MUST prevent trip planning when current charge is at or below the reserve arrival percentage and display a clear error message.

- **FR-004**: System MUST fetch route data including total distance, estimated duration, and route geometry when given origin and destination coordinates.

- **FR-004a**: When the routing service is unavailable or returns an error, System MUST display a clear error message with a manual retry button (user-initiated, no automatic retries) and suggest checking the network connection.

- **FR-005**: System MUST place virtual charging stops along the route when accumulated distance exceeds safe range minus buffer, assuming 80% charge after each stop, with a maximum of 5 stops.

- **FR-006**: System MUST visually distinguish safe route segments (within safe range) from risky segments (approaching or exceeding safe range) using color coding.

- **FR-007**: System MUST display charging stop markers on the map with interactive tooltips showing stop information.

- **FR-008**: System MUST generate a Google Maps URL with origin, destination, and all charging stops as waypoints for turn-by-turn navigation.

- **FR-009**: System MUST cache route data for 7 days to improve performance on repeated route requests.

- **FR-010**: System MUST support both desktop and mobile device viewports with responsive breakpoints at 375px (mobile), 768px (tablet), and 1024px+ (desktop). Touch targets MUST be at least 44px on mobile viewports.

- **FR-011**: System MUST meet WCAG 2.1 Level AA accessibility standards for all user-facing features, including keyboard navigation, screen reader compatibility, and sufficient color contrast.

### Key Entities _(include if feature involves data)_

- **Trip**: Represents a planned journey from origin to destination. Attributes: origin (location), destination (location), parameters (EV settings), created timestamp.

- **EVParameters**: Contains vehicle and trip settings. Attributes: currentStateOfCharge (%), rangeAtFullCharge (km), reserveArrival (%), drivingFactor (Eco/Normal/Highway multiplier).

- **Route**: Contains path information between two points. Attributes: totalDistance (km), estimatedDuration (minutes), geometry (path coordinates), origin, destination.

- **SafeRange**: Calculated result of available driving distance. Attributes: safeDistance (km), effectiveRange (km with factor applied), bufferApplied (km).

- **ChargingStop**: A suggested location to recharge. Attributes: position along route, distance from start, estimated arrival charge (%), charge target (%), sequence number.

- **RouteSegment**: A portion of the route with safety status. Attributes: start coordinate, end coordinate, segment distance, safety status (safe/risky), cumulative distance from origin.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete trip input and view route visualization in under 30 seconds on a standard internet connection.

- **SC-002**: Safe range calculations are deterministic and produce identical results for identical inputs across all executions.

- **SC-003**: 100% of routes requiring charging stops correctly place stops within the safe range minus buffer threshold.

- **SC-004**: Google Maps handoff successfully opens with all waypoints in the correct order for 100% of attempted handoffs.

- **SC-005**: Route data is served from cache on subsequent identical requests within 7 days, reducing data fetch time by at least 80%.

- **SC-006**: All error states (insufficient charge, invalid locations, network failures) display clear, actionable messages to users.

- **SC-007**: Core calculation logic (safe range, stop placement, URL building) is fully covered by automated unit tests.

## Clarifications

### Session 2026-02-28

- **Q**: Should the system implement rate limiting on route API requests? → **A**: Basic rate limiting implemented in feature/002-rate-limiting (60 req/min per IP) to comply with Constitution IV
- **Q**: What are the acceptable ranges for EV parameter inputs? → **A**: Strict validation with bounds: SOC 0-100%, reserve 0-50%, range >0 km, factor >=1.0
- **Q**: How should the system handle routing service failures? → **A**: Display user-friendly error with retry option and suggest checking connection
- **Q**: What accessibility standard should the MVP target? → **A**: WCAG 2.1 Level AA compliance
- **Q**: How should user trip data be handled regarding privacy? → **A**: Store vehicle defaults in localStorage only; trip history not persisted to maintain privacy and minimize data retention
- **Q**: What location input formats should the system accept? → **A**: Both free-text addresses and lat/lng coordinates
- **Q**: What responsive viewport breakpoints should be supported? → **A**: 375px mobile, 768px tablet, 1024px+ desktop
- **Q**: What error retry mechanism should be implemented? → **A**: Manual retry button only (user-initiated), no automatic retries

## Assumptions

- Route geometry data is available from an external routing service (implementation-agnostic).

- Google Maps URL format remains compatible with the documented API structure.

- Users understand basic EV terminology (state of charge, range, kWh) without requiring in-app education.

- A 10km buffer for stop placement provides adequate safety margin for most driving conditions.

- Assuming 80% charge at each stop is a reasonable default for trip planning purposes.

## Out of Scope (MVP)

- Real-time traffic integration for dynamic range adjustments.

- Actual charging station database lookup (using virtual stops only).

- Alternative route suggestions or route optimization.

- Weather or elevation impact on range calculations.

- Integration with vehicle telematics for actual SOC reading.
