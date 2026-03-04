# <!--

# SYNC IMPACT REPORT

Version Change: 1.2.0 → 1.3.0 (MINOR: new principle added)

Modified Principles: None

New Principles Added:

- XI. Code Security Standards

Added Sections: None

Removed Sections: None

Templates Requiring Updates:
[PASS] .specify/templates/plan-template.md - Constitution Check section aligns with principles
[PASS] .specify/templates/spec-template.md - Requirements section aligns with security principles
[PASS] .specify/templates/tasks-template.md - Task categorization reflects security principles

# Deferred Items: None

-->

# Smart EV Overlay Constitution

## Purpose & Scope

This constitution governs the development of **Smart EV Overlay for Google Maps**, a pre-trip planning web application that helps EV drivers visualize safe travel ranges and identify optimal charging stops along their route.

**MVP Scope MUST Include:**

- Trip input UI (origin/destination, SoC, range@100%, reserve%, driving factor preset)
- Route retrieval via Worker proxy to a routing provider (public OSRM acceptable)
- Deterministic EV estimation with conservative safety margins
- Overlay visualization: route polyline, safe/risky segment coloring, stop markers
- "Open in Google Maps" button with waypoint generation
- Clear error states for all failure modes

**MVP Scope MUST Exclude:**

- Real-time charger availability, queue prediction, reservations
- OEM telemetry / OBD integrations
- Elevation/traffic/weather modeling beyond user-controlled factors
- User accounts, payments
- Guarantees of arrival SOC or charging success

---

## Core Principles

### I. Cloudflare-First Infrastructure

**All infrastructure MUST run on Cloudflare's edge platform.**

- Frontend: Cloudflare Pages hosting a Vue 3 + Vite SPA
- Edge API: Cloudflare Workers
- Caching: Cloudflare KV (route caching, TTL 7 days)
- NO paid infrastructure assumptions (no VPS required for MVP)
- Secrets MUST NOT be shipped to the client; keep them in Workers only

**Rationale**: Keeps infrastructure costs at zero for MVP while leveraging global edge distribution for performance. Enforces clean separation between client and server secrets.

---

### II. Conservative Safety-First UX

**The application MUST prioritize driver safety through conservative defaults and clear uncertainty communication.**

- All outputs MUST be presented as estimates; avoid false certainty
- Defaults MUST be conservative:
  - `reserveArrival` default: 20%
  - `bufferKm` default: 10 km
  - `factor` (driving efficiency): conservative preset options
- NEVER recommend arriving below reserve; show warnings and suggest higher reserve or additional stop
- App is for pre-trip planning only; MUST NOT encourage interaction while driving
- One-screen mental model: left panel inputs/summary, right map overlay, primary CTA "Open in Google Maps"

**Rationale**: EV range anxiety is real. Conservative estimates prevent dangerous situations. Clear handoff to Google Maps ensures drivers use appropriate navigation tools while driving.

---

### III. Deterministic Core Logic

**All EV estimation logic MUST be deterministic, mathematically verifiable, and free of machine learning.**

The core formula:

```
safeRangeKm = ((socNow - reserveArrival)/100) * (range100Km / factor)
```

Additional rules:

- Multi-stop heuristic: assume chargeToPercent=80% for subsequent legs
- Enforce max stops (5) with graceful fallback
- No probabilistic scoring or ML-based predictions in MVP
- All core logic MUST be pure functions with no side effects

**Rationale**: Deterministic logic is testable, auditable, and explainable. Drivers need to understand and trust the calculations affecting their trip safety.

---

### IV. Security & Privacy by Design

**The application MUST protect user data and prevent common security vulnerabilities.**

- Input validation: lat/lng bounds, numeric ranges, string sanitization
- Explicit CORS control at Worker level
- Basic rate limiting at Worker
- NO PII collection in MVP (no login required)
- Origin/destination treated as sensitive; minimize retention and logging
- Do not log raw origin/destination in persistent logs
- Secrets MUST remain server-side only
- Local-only storage for vehicle defaults (localStorage)

**Rationale**: Location data is sensitive PII. Minimizing data collection and retention reduces privacy risk and compliance burden.

---

### V. Separation of Concerns Architecture

**Code MUST be organized into clear, independent packages with distinct responsibilities.**

```
packages/core    - Pure deterministic TS logic
  - distance accumulation
  - stop placement algorithm
  - Google Maps URL builder
  - safe range calculations

apps/web         - UI + map rendering
  - Vue 3 components
  - Map visualization (safe/risky segments)
  - User input handling

workers/api      - Edge API layer
  - Route proxying
  - Caching logic
  - CORS, rate limiting
  - Provider response normalization
```

Rules:

- `core` MUST have zero dependencies on browser or Node APIs
- `core` MUST be 100% unit testable without mocks
- `web` MUST NOT call routing providers directly; always through Worker
- `api` MUST normalize all provider responses to stable internal schema

**Rationale**: Clean separation enables independent testing, simplifies reasoning, and allows future provider swaps without UI changes.

---

### VI. Reliability & Performance

**The application MUST handle failures gracefully and respond quickly.**

- Network calls MUST have timeouts + bounded retries
- User-friendly error messages; NEVER silently fail
- Error states MUST include: geocode fail, route fail, invalid SOC, provider down
- KV caching TTL: 7 days for routes
- Avoid heavy dependencies; keep bundle small
- Recompute overlay client-side without re-fetching route when only EV params change
- Normalize provider responses to stable internal schema

**Rationale**: Drivers depend on this tool for trip planning. Failures must be clear and actionable. Caching reduces costs and improves response times.

---

### VII. Definition of Done Quality Gate

**A feature is complete ONLY when all quality criteria are met.**

Every feature MUST:

- Meet acceptance behavior + edge-case handling
- Have appropriate tests (core logic unit tests at minimum)
- Have explicit loading/success/error UI states
- Not leak secrets to the client bundle
- Work on mobile + desktop modern browsers

**Test Policy:**

- Unit tests REQUIRED for core: safeRange, distance accumulation, stop placement, URL builder
- Minimal integration tests for worker: normalize response + cache HIT/MISS

**Rationale**: Quality gates prevent technical debt accumulation and ensure consistent user experience across platforms.

---

### VIII. Phase-Gated Delivery

**Work MUST proceed in strictly ordered phases with explicit completion criteria.**

- **Phase 1**: MVP (virtual stops + conservative model + Google Maps handoff)
- **Phase 2+**: Charger POI suggestions, improved heuristics

**Rule**: No Phase 2+ work until Phase 1 Definition of Done is satisfied.

**Rationale**: Prevents scope creep and ensures foundational functionality is solid before adding complexity. MVP must deliver standalone value.

---

### IX. Playwright Web Testing

**Critical user journeys MUST be covered by automated end-to-end tests using Playwright.**

- E2E tests MUST cover the primary user flow: input origin/destination → view overlay → open Google Maps
- Tests MUST run against the built application in a production-like environment
- Mobile viewport testing REQUIRED (iPhone SE, iPhone 14 Pro Max dimensions)
- Tests MUST be deterministic and not depend on external API availability (use mocks/stubs for routing provider)
- Visual regression tests SHOULD capture the map overlay rendering
- CI pipeline MUST run E2E tests on every PR before merge

**Rationale**: End-to-end tests validate the complete user experience across the full stack. Playwright provides cross-browser, mobile-responsive testing that catches integration issues unit tests cannot.

---

### X. Code Quality Standards

**All code MUST meet consistent quality standards enforced through automation and review.**

- Linting and formatting tools MUST be configured and enforced in CI
  - ESLint for TypeScript with recommended rules and consistent configuration
  - Prettier for consistent formatting with 2-space indentation, no trailing commas
- TypeScript strict mode MUST be enabled with no implicit any
- Complex functions MUST be refactored when cognitive complexity exceeds 15
- Code review checklist MUST include: type safety, error handling, test coverage, security implications
- Dead code MUST be removed; no commented-out code blocks in committed code
- Naming conventions MUST be enforced: camelCase for variables/functions, PascalCase for types/classes, UPPER_SNAKE_CASE for constants

**Rationale**: Automated quality enforcement reduces cognitive load during reviews, prevents common bugs, and maintains consistent readability across the codebase. Strict TypeScript catches errors at compile time rather than runtime.

---

### XI. Code Security Standards

**All code MUST follow secure coding practices to prevent vulnerabilities and protect against common attack vectors.**

- Dependency vulnerabilities MUST be scanned and remediated before merge
  - Automated scanning with `npm audit` or equivalent in CI
  - Known high/critical vulnerabilities MUST be fixed; exceptions require documented risk acceptance
- Secrets and credentials MUST NEVER be hardcoded in source code
  - API keys, tokens, and passwords MUST use environment variables or secure secret management
  - `.env` files and credential files MUST be in `.gitignore`
- No SQL injection vectors: parameterized queries or ORM usage only; string concatenation into queries is FORBIDDEN
- No command injection: shell execution with user input is FORBIDDEN; sanitize all external inputs
- DOM-based XSS prevention: innerHTML with unsanitized user input is FORBIDDEN; use textContent or framework-safe rendering
- URL construction MUST use proper encoding; string concatenation for URLs with user input is FORBIDDEN
- All third-party dependencies MUST be evaluated for security posture and maintenance status before adoption
- Security-focused code review checklist MUST verify: no hardcoded secrets, no injection vectors, input validation present

**Rationale**: Code-level security prevents exploitation of application vulnerabilities. Automated scanning and strict coding standards catch security issues early before they reach production, reducing risk of data breaches and service compromise.

---

## Governance

### Amendment Procedure

1. Proposed changes MUST be documented with rationale
2. Changes affecting principles require explicit approval
3. Migration plan required for breaking changes
4. Version MUST be updated per semantic versioning:
   - MAJOR: Backward incompatible principle removals/redefinitions
   - MINOR: New principle/section added or materially expanded
   - PATCH: Clarifications, wording, typo fixes

### Compliance Review

- All PRs MUST verify compliance with constitution principles
- Complexity MUST be justified against "simpler alternative" analysis
- Constitution supersedes all other practices when in conflict

### Version History

| Version | Date       | Change Summary                             |
| ------- | ---------- | ------------------------------------------ |
| 1.0.0   | 2026-02-28 | Initial ratification                       |
| 1.1.0   | 2026-02-28 | Add Playwright Web Testing principle (IX)  |
| 1.2.0   | 2026-03-01 | Add Code Quality Standards principle (X)   |
| 1.3.0   | 2026-03-01 | Add Code Security Standards principle (XI) |

---

**Version**: 1.3.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-03-01
