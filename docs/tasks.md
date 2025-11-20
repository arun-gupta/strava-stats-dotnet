# Technical Task List — Strava Activity Analyzer

Status: Draft v1 (2025-11-20)

Purpose
- This document enumerates concrete technical tasks derived from the implementation plan and requirements.
- Every task is a checkbox `[ ]`, grouped into development phases. Each item references the corresponding Plan section(s) in `docs/plan.md` and related Requirement IDs in `docs/requirements.md`.

Link Legend
- Plan links: `plan.md#...` refer to section headings (e.g., Plan 1.1, 2.1, etc.).
- Requirements links: `requirements.md#group-...` point to the relevant requirement group; the exact R# is listed alongside.

---

## Phase 1 — Foundation & Auth (M1)

[ ] Initialize solution skeleton (.NET 8 minimal API + server-rendered UI), repo layout, CI stub, and README bootstrap. Ref: [Plan 9.1](plan.md#91-technology-stack-decision-implementation-agnostic-requirement), [Plan 5.2](plan.md#52-module-layout); Reqs: [R18](requirements.md#group-e--api-and-architecture-optional-when-spa--api), All (supporting).

[ ] Establish module layout/namespaces: `auth`, `strava_client`, `analytics`, `presentation/ui`, `config`, `cache`, `logging`. Ref: [Plan 5.2](plan.md#52-module-layout), [Plan 9.1](plan.md#91-technology-stack-decision-implementation-agnostic-requirement); Reqs: [R18](requirements.md#group-e--api-and-architecture-optional-when-spa--api).

[ ] Implement configuration & secrets management: env binder, `appsettings` overrides, `.env.example`, and config health-check. Ref: [Plan 1.4](plan.md#14-multi-environment-configuration), [Plan 9.3](plan.md#93-configuration--secrets-management); Reqs: [R4](requirements.md#group-a--authentication-and-security).

[ ] Add structured logging and error handling middleware; scrub PII/tokens; correlation IDs. Ref: [Plan 9.5](plan.md#95-logging--error-handling), [Plan 1.3](plan.md#13-privacy--secure-handling); Reqs: [R22](requirements.md#group-f--non-functional-requirements), [R3](requirements.md#group-a--authentication-and-security).

[ ] Build OAuth2 Authorization Code flow: `/auth/login`, `/auth/callback` (server-side secret), state parameter CSRF protection, secure session cookie, redirect to dashboard. Ref: [Plan 1.1](plan.md#11-oauth2-authorization-code-with-pkce-or-server-secret); Reqs: [R1](requirements.md#group-a--authentication-and-security), [R3](requirements.md#group-a--authentication-and-security), [R4](requirements.md#group-a--authentication-and-security).

[ ] Document Strava scopes used (`read`, `activity:read_all`) and compliance notes. Ref: [Plan 1.3](plan.md#13-privacy--secure-handling); Reqs: [R3](requirements.md#group-a--authentication-and-security), [R27](requirements.md#group-h--edge-cases-and-rules).

---

## Phase 2 — Data Client & Basics (M2)

[ ] Implement Strava API client with pagination; respect rate limits using response headers; exponential backoff and retry policy. Ref: [Plan 2.1](plan.md#21-strava-api-client-with-pagination-backoff-caching); Reqs: [R5](requirements.md#group-b--data-acquisition-and-handling), [R28](requirements.md#group-h--edge-cases-and-rules).

[ ] Add centralized token refresh handling; auto-retry a single failed request after refresh. Ref: [Plan 1.2](plan.md#12-token-refresh--retry), [Plan 2.1](plan.md#21-strava-api-client-with-pagination-backoff-caching); Reqs: [R2](requirements.md#group-a--authentication-and-security).

[ ] Normalize timestamps to user timezone using Strava `start_date_local`/`timezone`; apply cross-midnight assignment rule; document behavior. Ref: [Plan 2.2](plan.md#22-timezone-normalization--cross-midnight-rule); Reqs: [R6](requirements.md#group-b--data-acquisition-and-handling).

[ ] Standardize API error envelope and typed error codes; surface actionable UI messages; handle revoked/expired tokens with re-auth prompt. Ref: [Plan 2.3](plan.md#23-graceful-handling-no-data-api-failures-rate-limits-reauth-prompts); Reqs: [R7](requirements.md#group-b--data-acquisition-and-handling).

[ ] Define domain models (`Activity`, `Split`, `AggregateDay`, `TrendPoint`) and implement core analytics service functions for counts, time, distance, pace, streaks. Ref: [Plan 9.2](plan.md#92-domain-models--analytics-service); Reqs: [R8](requirements.md#group-c--dashboard-and-widgets)–[R14](requirements.md#group-c--dashboard-and-widgets), [R26](requirements.md#group-h--edge-cases-and-rules).

[ ] Implement caching layer (in-memory initially) for activity lists and summary responses; keys include user, date range, and units; TTL + invalidation on unit/range change; delete-by-user. Ref: [Plan 9.4](plan.md#94-caching-layer), [Plan 2.1](plan.md#21-strava-api-client-with-pagination-backoff-caching); Reqs: [R5](requirements.md#group-b--data-acquisition-and-handling), [R19](requirements.md#group-f--non-functional-requirements), [R21](requirements.md#group-f--non-functional-requirements), [R28](requirements.md#group-h--edge-cases-and-rules).

---

## Phase 3 — API Surfaces (M3)

[ ] Implement `/api/me/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&units=metric|imperial` returning all widget data; define DTOs and schema. Ref: [Plan 5.1](plan.md#51-summary-endpoint-andor-per-widget-endpoints); Reqs: [R17](requirements.md#group-e--api-and-architecture-optional-when-spa--api).

[ ] Optionally expose per-widget endpoints; document response contracts and versioning. Ref: [Plan 5.1](plan.md#51-summary-endpoint-andor-per-widget-endpoints); Reqs: [R17](requirements.md#group-e--api-and-architecture-optional-when-spa--api).

[ ] Verify module boundaries and references; ensure `presentation/ui` consumes only API contracts. Ref: [Plan 5.2](plan.md#52-module-layout); Reqs: [R18](requirements.md#group-e--api-and-architecture-optional-when-spa--api).

---

## Phase 4 — Dashboard MVP (M4)

[ ] Build unauthenticated index/login page with “Connect with Strava” button and privacy note; wire to OAuth. Ref: [Plan 7.1](plan.md#71-indexlogin-page-unauthenticated); Reqs: [R23](requirements.md#group-g--ui-pages-and-navigation).

[ ] Build authenticated dashboard shell with layout, date controls, units toggle, sign-out. Ref: [Plan 7.2](plan.md#72-dashboard-authenticated); Reqs: [R24](requirements.md#group-g--ui-pages-and-navigation).

[ ] Implement Activity Count Distribution widget (counts per activity type with percentages). Ref: [Plan 3.1](plan.md#31-activity-count-distribution-piedonut); Reqs: [R8](requirements.md#group-c--dashboard-and-widgets), [R15](requirements.md#group-d--filters-units-and-internationalization).

[ ] Implement Time Distribution by Activity Type widget (total moving time per type, HH:MM). Ref: [Plan 3.2](plan.md#32-time-distribution-by-activity-type-piedonut); Reqs: [R9](requirements.md#group-c--dashboard-and-widgets), [R15](requirements.md#group-d--filters-units-and-internationalization).

[ ] Implement Workout Heatmap with streaks (calendar grid; count or time per day; ISO week alignment noted). Ref: [Plan 3.3](plan.md#33-workout-heatmap-calendar-grid--streaks); Reqs: [R10](requirements.md#group-c--dashboard-and-widgets), [R26](requirements.md#group-h--edge-cases-and-rules).

[ ] Implement Date Range filters with presets and persistence (URL or session); ensure all widgets recompute. Ref: [Plan 4.1](plan.md#41-date-range-filters-with-presets--persistence); Reqs: [R15](requirements.md#group-d--filters-units-and-internationalization).

[ ] Implement Units toggle (metric/imperial) affecting all widgets, labels, tooltips, and axis formats. Ref: [Plan 4.2](plan.md#42-units-toggle-metricimperial--locale-formatting); Reqs: [R16](requirements.md#group-d--filters-units-and-internationalization).

---

## Phase 5 — Runner Features (M5)

[ ] Implement Running Heatmap (daily distance intensity) with running-specific streaks. Ref: [Plan 3.4](plan.md#34-running-heatmap-distance-intensity--streaks); Reqs: [R11](requirements.md#group-c--dashboard-and-widgets), [R26](requirements.md#group-h--edge-cases-and-rules).

[ ] Implement Running Stats & PRs (totals, 10K count, total distance, avg pace; distance histogram; PRs: mile, 10K, longest run, most elevation). Ref: [Plan 3.5](plan.md#35-running-stats--prs); Reqs: [R12](requirements.md#group-c--dashboard-and-widgets).

[ ] Implement Mileage Trend (daily/weekly/monthly with 7-day moving average for daily). Ref: [Plan 3.6](plan.md#36-mileage-trend); Reqs: [R13](requirements.md#group-c--dashboard-and-widgets), [R26](requirements.md#group-h--edge-cases-and-rules).

[ ] Implement Pace Trend (average pace with correct speed inversion; MM:SS; tooltips). Ref: [Plan 3.7](plan.md#37-pace-trend); Reqs: [R14](requirements.md#group-c--dashboard-and-widgets), [R26](requirements.md#group-h--edge-cases-and-rules).

---

## Phase 6 — NFRs & Polish (M6)

[ ] Performance tuning and budgets: ensure initial render < 2s on typical dataset; lazy-load charts; observe cache hit ratio. Ref: [Plan 6.1](plan.md#61-performance-targets-and-caching-strategy), [Plan 9.4](plan.md#94-caching-layer); Reqs: [R19](requirements.md#group-f--non-functional-requirements), [R5](requirements.md#group-b--data-acquisition-and-handling).

[ ] Accessibility improvements: keyboard navigation for all controls; contrast-compliant palettes; legends/tooltips; ARIA where appropriate. Ref: [Plan 6.2](plan.md#62-accessibility-a11y); Reqs: [R20](requirements.md#group-f--non-functional-requirements).

[ ] Data retention controls: endpoint/UI for user-triggered cache purge; avoid retaining raw activity data longer than necessary. Ref: [Plan 6.3](plan.md#63-data-retention-controls), [Plan 9.4](plan.md#94-caching-layer); Reqs: [R21](requirements.md#group-f--non-functional-requirements).

[ ] Observability & error tracking: structured logs with levels and error IDs; optional basic error tracking integration; confirm PII/tokens excluded. Ref: [Plan 6.4](plan.md#64-observability--error-tracking), [Plan 1.3](plan.md#13-privacy--secure-handling); Reqs: [R22](requirements.md#group-f--non-functional-requirements), [R3](requirements.md#group-a--authentication-and-security).

[ ] Error views: friendly error page mapping API/auth failures to actionable guidance. Ref: [Plan 7.3](plan.md#73-error-views); Reqs: [R25](requirements.md#group-g--ui-pages-and-navigation), [R7](requirements.md#group-b--data-acquisition-and-handling).

[ ] Weekly/monthly rules: enforce ISO week (Mon–Sun) and calendar months; document rules in UI/README. Ref: [Plan 8.1](plan.md#81-weeklymonthly-rules-iso-week); Reqs: [R26](requirements.md#group-h--edge-cases-and-rules).

[ ] Private activities handling: include only when `activity:read_all` is granted; otherwise exclude and label accordingly. Ref: [Plan 8.2](plan.md#82-private-activities-scope-handling), [Plan 1.3](plan.md#13-privacy--secure-handling); Reqs: [R27](requirements.md#group-h--edge-cases-and-rules), [R3](requirements.md#group-a--authentication-and-security).

[ ] Large dataset stability & UX: batch/paginate, streaming where viable, loading states, and timeout avoidance. Ref: [Plan 8.3](plan.md#83-large-datasets-stability--ux); Reqs: [R28](requirements.md#group-h--edge-cases-and-rules), [R19](requirements.md#group-f--non-functional-requirements).

---

## Phase 7 — Testing & QA (cross-cutting)

[ ] Unit tests for analytics functions: counts, time, distance, pace, streaks; include DST and ISO week cases. Ref: [Plan 9.2](plan.md#92-domain-models--analytics-service), [Plan 8.1](plan.md#81-weeklymonthly-rules-iso-week); Reqs: [R8](requirements.md#group-c--dashboard-and-widgets)–[R14](requirements.md#group-c--dashboard-and-widgets), [R26](requirements.md#group-h--edge-cases-and-rules).

[ ] Integration tests for OAuth flow and token refresh, including CSRF/state and cookie security flags. Ref: [Plan 1.1](plan.md#11-oauth2-authorization-code-with-pkce-or-server-secret), [Plan 1.2](plan.md#12-token-refresh--retry); Reqs: [R1](requirements.md#group-a--authentication-and-security), [R2](requirements.md#group-a--authentication-and-security), [R3](requirements.md#group-a--authentication-and-security).

[ ] API contract tests for `/api/me/summary` and per-widget endpoints; schema validation. Ref: [Plan 5.1](plan.md#51-summary-endpoint-andor-per-widget-endpoints); Reqs: [R17](requirements.md#group-e--api-and-architecture-optional-when-spa--api).

[ ] Performance verification with seeded dataset (<5,000 activities): initial render < 2s; cache effectiveness. Ref: [Plan 6.1](plan.md#61-performance-targets-and-caching-strategy); Reqs: [R19](requirements.md#group-f--non-functional-requirements).

[ ] Accessibility checks (keyboard nav, contrast, legends/tooltips) and fixes. Ref: [Plan 6.2](plan.md#62-accessibility-a11y); Reqs: [R20](requirements.md#group-f--non-functional-requirements).

[ ] Data retention and purge tests: verify delete-by-user clears cache/state. Ref: [Plan 6.3](plan.md#63-data-retention-controls), [Plan 9.4](plan.md#94-caching-layer); Reqs: [R21](requirements.md#group-f--non-functional-requirements).

[ ] Observability checks: ensure sensitive fields absent from logs; error IDs present; log levels adjustable. Ref: [Plan 6.4](plan.md#64-observability--error-tracking), [Plan 1.3](plan.md#13-privacy--secure-handling); Reqs: [R22](requirements.md#group-f--non-functional-requirements), [R3](requirements.md#group-a--authentication-and-security).

[ ] UI/UX validation for error views and recovery flows. Ref: [Plan 7.3](plan.md#73-error-views); Reqs: [R25](requirements.md#group-g--ui-pages-and-navigation), [R7](requirements.md#group-b--data-acquisition-and-handling).

---

Notes
- Phases align with Plan Milestones (M1–M6). Phase 7 aggregates testing tasks across features and should be executed continuously with each phase.
- Use the acceptance outlines in Plan Section 11 as the baseline for test scenarios.
