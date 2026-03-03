# Feature Specification: Geolocation Map Defaults

**Feature Branch**: `003-geolocation-map-defaults`
**Created**: 2026-03-03
**Status**: Complete
**Input**: User description: "Please update the route/map experience with these defaults: Set the Origin field to the user's Current Location by default. On initial page load, default the map view to Thailand. Once geolocation is available, automatically recenter the map to the user's current location. If location permission is denied or unavailable, fallback to central Thailand (lat: 13.7563, lng: 100.5018) with an appropriate zoom level. Show a loading state while fetching geolocation, and show a clear error/notice if current location cannot be retrieved."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default Map View on Load (Priority: P1)

As a user opening the route/map page, I want to immediately see a map centered on Thailand so that I have context for the application's primary service area while my location is being determined.

**Why this priority**: This provides immediate visual context and prevents a blank or loading screen, reducing perceived wait time and establishing the application's geographic focus.

**Independent Test**: Can be fully tested by opening the route page without granting location permissions - the map should display Thailand centered appropriately.

**Acceptance Scenarios**:

1. **Given** the user navigates to the route/map page, **When** the page loads, **Then** the map is centered on Thailand with an appropriate zoom level to show the country boundaries
2. **Given** the user has never visited the page before, **When** the page loads, **Then** Thailand is visible as the default view before any geolocation request is made

---

### User Story 2 - Origin Set to Current Location (Priority: P1)

As a user planning a route, I want the Origin field to default to my current location so that I don't have to manually enter my starting point.

**Why this priority**: This is the primary user value proposition - eliminating manual data entry for the most common use case (starting from where you are now).

**Independent Test**: Can be fully tested by loading the route page with location permission granted - the Origin field should automatically populate with "Current Location" or equivalent label.

**Acceptance Scenarios**:

1. **Given** the user grants location permission, **When** the page loads and geolocation is retrieved, **Then** the Origin field is automatically set to the user's current location
2. **Given** the Origin field is set to current location, **When** the user views the field, **Then** it displays a user-friendly label (e.g., "Current Location" or "My Location") rather than raw coordinates
3. **Given** the user has previously set a manual origin, **When** they reload the page and grant location permission, **Then** the Origin field updates to current location as the new default

---

### User Story 3 - Automatic Map Recentering (Priority: P2)

As a user who has granted location permission, I want the map to automatically pan to my current location once it's available so that I can see my position relative to the service area.

**Why this priority**: While valuable for orientation, this is secondary to having a functional default view (Thailand) and populated origin field. The map recentering provides additional context but doesn't block the primary task.

**Independent Test**: Can be fully tested by granting location permission after page load - the map should smoothly transition from Thailand view to the user's current location.

**Acceptance Scenarios**:

1. **Given** the map is currently showing Thailand as the default view, **When** geolocation becomes available, **Then** the map smoothly pans and zooms to center on the user's current location
2. **Given** the user's current location is outside Thailand, **When** the map recenters, **Then** the user can still see relevant context or boundaries
3. **Given** the user has manually panned or zoomed the map before geolocation completes, **When** geolocation becomes available, **Then** the map MUST NOT auto-recenter and MUST respect the user's manual viewport selection

---

### User Story 4 - Geolocation Fallback Handling (Priority: P2)

As a user who denies location permission or has geolocation unavailable, I want the application to gracefully fallback to a sensible default location so that I can still use the route planning feature.

**Why this priority**: Error handling is essential for a complete user experience, but represents an edge case compared to the happy path where users grant permission.

**Independent Test**: Can be fully tested by denying location permission or testing in a browser without geolocation support - the application should remain functional with central Thailand as the fallback.

**Acceptance Scenarios**:

1. **Given** the user denies location permission when prompted, **When** the permission is denied, **Then** the Origin field remains empty or shows a placeholder, and the map remains centered on Thailand
2. **Given** geolocation is unavailable (e.g., device doesn't support it), **When** the page loads, **Then** the map centers on central Thailand coordinates (latitude: 13.7563, longitude: 100.5018) with appropriate zoom
3. **Given** the geolocation request times out after a reasonable period, **When** the timeout occurs, **Then** the application gracefully degrades to the Thailand fallback without errors
4. **Given** the fallback location is active, **When** the user attempts to plan a route, **Then** they are still able to manually enter an origin location

---

### User Story 5 - Loading State and Error Feedback (Priority: P2)

As a user waiting for my location to be determined, I want clear visual feedback about what's happening and any issues that arise so that I understand the application state.

**Why this priority**: Loading states and error messages prevent user confusion and set appropriate expectations during the brief period when geolocation is being requested.

**Independent Test**: Can be fully tested by observing the UI during page load - there should be visual indicators while loading and clear messages if location cannot be retrieved.

**Acceptance Scenarios**:

1. **Given** the page is loading, **When** geolocation is being requested, **Then** a visual loading indicator is shown (e.g., spinner, skeleton state, or "Locating..." message)
2. **Given** geolocation permission is denied, **When** the denial occurs, **Then** a clear, non-intrusive notice is displayed explaining that manual location entry will be required
3. **Given** geolocation fails for any reason (timeout, error, unavailable), **When** the failure occurs, **Then** an appropriate error message is shown and the user can dismiss it or it auto-dismisses after a reasonable time
4. **Given** the loading state is active, **When** geolocation successfully resolves, **Then** the loading indicator is removed and replaced with the location information

---

### Edge Cases

- What happens when the user's current location is outside Thailand? The map should still recenter to show the user's location, potentially with visual indicators about service area boundaries.
- How does the system handle intermittent geolocation where the position flickers or is imprecise? The system should apply reasonable accuracy thresholds and smoothing to prevent jarring map movements.
- What if the user grants permission but the location accuracy is very low (e.g., IP-based approximation)? The system should still use the available location but may indicate approximate positioning to the user.
- How is the experience handled when the user switches tabs while geolocation is pending? The request should continue or gracefully handle the context switch without errors.
- What happens if the user revokes location permission after initially granting it? The application should detect this and gracefully fallback to manual entry mode.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST default the map view to Thailand on initial page load before geolocation is available
- **FR-002**: The system MUST automatically set the Origin field to the user's current location once geolocation permission is granted and position is retrieved with accuracy better than 1km (1000m)
- **FR-003**: The system MUST recenter the map view to the user's current location once geolocation becomes available, but only if the user has not manually panned or zoomed the map
- **FR-004**: The system MUST fallback to central Thailand coordinates (latitude: 13.7563, longitude: 100.5018) with zoom level 6 when geolocation permission is denied
- **FR-005**: The system MUST fallback to central Thailand coordinates when geolocation is unavailable or fails
- **FR-006**: The system MUST timeout geolocation requests after 5 seconds and fallback to the default Thailand view
- **FR-007**: The system MUST display a loading indicator while requesting geolocation permission and retrieving the user's position
- **FR-008**: The system MUST display a clear, user-friendly notice when location cannot be retrieved due to permission denial or technical failure
- **FR-009**: The Origin field MUST display a user-friendly label (e.g., "Current Location") rather than raw coordinates when using geolocation
- **FR-010**: The system MUST allow users to manually override the auto-populated origin location at any time
- **FR-011**: The system MUST remember the user's location preference for the current browser session only (not persisted across sessions)
- **FR-012**: The map recentering animation MUST be smooth (1.5s flyTo animation) and not disorienting to the user

### Key Entities

- **User Location**: Represents the geographic position of the user, including latitude, longitude, and accuracy information
- **Map View State**: Represents the current viewport of the map, including center coordinates, zoom level, and default/fallback configuration
- **Origin Input**: Represents the starting point field in the route planning interface, which can be auto-populated or manually entered

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see a fully rendered map within 2 seconds of page load, regardless of geolocation availability
- **SC-002**: 90% of users who grant location permission have their Origin field auto-populated within 5 seconds
- **SC-003**: Users can complete a route planning task without manually entering their origin when location permission is granted
- **SC-004**: Users with denied or unavailable location permissions can still successfully plan routes using the fallback location and manual entry
- **SC-005**: The loading state is displayed for no more than 10 seconds before resolving to either success or graceful fallback
- **SC-006**: Error messages for location failures are understood by 95% of users without additional explanation

## Clarifications

### Session 2026-03-03

- **Q**: What is the maximum time to wait for geolocation before showing fallback? → **A**: 5 seconds (Option B)
- **Q**: When the user is outside Thailand, should the map recenter to their location or stay focused on Thailand? → **A**: Always recenter to user's actual location (Option A)
- **Q**: Should the app remember and reuse the user's location choice across page refreshes/sessions? → **A**: Remember for current session only (Option B)
- **Q**: What is the minimum location accuracy required before auto-populating the Origin field? → **A**: 1km / 1000m (Option B)
- **Q**: If the user manually pans/zooms the map before geolocation completes, should it still auto-recenter when location is found? → **A**: Skip auto-recenter if user manually panned/zoomed (Option B)

## Assumptions

- The application primarily serves users in or traveling to Thailand, making Thailand the appropriate default geographic context
- Users who deny location permission understand they will need to manually enter locations
- Modern browsers with geolocation API support are the primary target (with graceful degradation for older browsers)
- The central Thailand fallback coordinates (Bangkok area) provide a reasonable default for the majority of use cases
- Location accuracy within approximately 1km (1000 meters) is the minimum threshold for auto-populating the origin field; less accurate readings fallback to manual entry
