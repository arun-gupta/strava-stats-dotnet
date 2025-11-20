# Implementation Plan — Strava Activity Analyzer

Status: Draft v1 (2025-11-20)

This plan translates the Requirements Document into an actionable implementation roadmap. Each plan item explicitly links to the corresponding requirement IDs (R1–R28) and is assigned a priority. Items are grouped logically by domain. A full requirements-to-plan traceability matrix is provided at the end to verify comprehensive coverage.

Conventions
- Priority scale: High (H) = must-have for first usable release; Medium (M) = important but not blocking MVP; Low (L) = nice-to-have or can follow shortly after MVP.
- Requirement IDs: R# correspond to the numbering in docs/requirements.md.
- Dependencies are listed only when they materially affect sequencing.

---

## 1. Auth & Security (Group A)

1.1 OAuth2 Authorization Code (with PKCE or server secret)
- Covers: R1, R3, R4
- Priority: H
- Tasks
  - Register Strava OAuth app for local, staging, prod; record client ID/secret, callbacks. (R4)
  - Implement OAuth redirect endpoints: `/auth/login`, `/auth/callback`. (R1)
  - Support PKCE for SPA or server-secret flow for server-rendered backend; choose server flow for simplicity. (R1)
  - Store access/refresh tokens server-side only; issue secure, HTTP-only session cookie. (R1, R3)
  - Use state parameter for CSRF, validate on callback. (R3)
  - After success, redirect to dashboard. (R1)
- Acceptance
  - Clicking “Connect with Strava” completes OAuth and lands on dashboard with valid server session. (R1)
  - Tokens never appear in browser storage or logs; state validated. (R3)
  - Environment-based config loads correct credentials and redirect URIs. (R4)
- Dependencies: 8.1 Config Management

1.2 Token Refresh & Retry
- Covers: R2
- Priority: H
- Tasks
  - Detect 401/expiration; use refresh token to obtain new access token automatically. (R2)
  - Centralize logic in Strava client; transparently retry the failed request once after refresh. (R2)
- Acceptance: Expired tokens auto-refresh without interrupting user session. (R2)
- Dependencies: 2.1 Strava API Client, 8.2 Observability

1.3 Privacy & Secure Handling
- Covers: R3
- Priority: H
- Tasks
  - Never log PII, tokens, or Strava payloads; add structured logging scrubbing. (R3)
  - Use secure cookies, SameSite=Lax, HTTPS-only in non-local envs. (R3)
  - Document API Terms compliance and scopes used (`read`, `activity:read_all`). (R3)
- Acceptance: No sensitive data in logs; cookies flagged secure; scope documentation present. (R3)

1.4 Multi-Environment Configuration
- Covers: R4
- Priority: H
- Tasks
  - Read `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`, `BASE_URL`, `SESSION_SECRET` from environment. (R4)
  - Provide `.env.example` and deployment notes. (R4)
- Acceptance: App boots with env vars for local/staging/prod and uses corresponding callback URI. (R4)

---

## 2. Data Acquisition & Handling (Group B)

2.1 Strava API Client with Pagination, Backoff, Caching
- Covers: R5, R28
- Priority: H
- Tasks
  - Implement REST client with rate-limit aware retry/backoff using Strava headers. (R5)
  - Paginate activities until range exhausted; batch size per Strava defaults. (R5, R28)
  - Introduce server-side cache layer keyed by user+date-range+units; short TTL plus ETag/Last-Modified support if available. (R5)
  - Expose `GetActivities(from,to)` returning normalized domain models. (R5)
- Acceptance: Dashboard loads complete set for typical ranges without exceeding rate limits; subsequent loads hit cache. (R5)

2.2 Timezone Normalization & Cross-Midnight Rule
- Covers: R6
- Priority: H
- Tasks
  - Convert activity timestamps to user’s timezone from Strava’s `start_date_local`/`timezone` fields. (R6)
  - Assign activities spanning midnight to start date; document rule. (R6)
- Acceptance: Daily/weekly metrics align with user’s expected local time. (R6)

2.3 Graceful Handling: No Data, API Failures, Rate Limits, Reauth Prompts
- Covers: R7
- Priority: H
- Tasks
  - Standard error envelope from API layer with typed error codes. (R7)
  - UI messages with retry action; show re-auth prompt on revoked/expired tokens beyond recovery. (R7)
- Acceptance: No crashes on empty ranges or failures; user sees recoverable guidance. (R7)

---

## 3. Dashboard Widgets (Group C)

3.1 Activity Count Distribution (pie/donut)
- Covers: R8, R15
- Priority: H
- Tasks: Aggregate counts per activity type within filter; compute percentages; render chart. (R8)
- Acceptance: Chart shows counts and percent labels; updates with date filter. (R8, R15)

3.2 Time Distribution by Activity Type (pie/donut)
- Covers: R9, R15
- Priority: H
- Tasks: Sum moving time per type; format HH:MM; render chart. (R9)
- Acceptance: Chart reflects time shares and respects filters. (R9, R15)

3.3 Workout Heatmap (calendar grid) + Streaks
- Covers: R10, R26
- Priority: H
- Tasks: Aggregate counts (or time) per day; render calendar grid; compute current and longest streaks. (R10, R26)
- Acceptance: Daily grid with tooltips and streak metrics; ISO week alignment noted. (R10, R26)

3.4 Running Heatmap (distance intensity) + Streaks
- Covers: R11, R26
- Priority: M
- Tasks: Filter runs; aggregate daily distance; render grid with intensity scale; compute streaks. (R11, R26)
- Acceptance: Daily run-specific heatmap and streaks present. (R11)

3.5 Running Stats & PRs
- Covers: R12
- Priority: H
- Tasks
  - Totals: runs count, runs ≥10K, total distance, average pace. (R12)
  - Histogram of run distances with default bins (1–10 miles) and extensible bins. (R12)
  - Compute PRs: fastest mile, fastest 10K, longest run, most elevation in a run; derive from activity and split data. (R12)
- Acceptance: Stats visible on load; PRs computed from available data. (R12)

3.6 Mileage Trend
- Covers: R13, R26
- Priority: H
- Tasks: Aggregate distance by daily/weekly/monthly; implement 7-day moving average for daily; tooltips. (R13, R26)
- Acceptance: Interactive chart with granularity toggle; ISO weeks observed. (R13, R26)

3.7 Pace Trend
- Covers: R14, R26
- Priority: M
- Tasks: Compute average pace (invert speed safely); support MM:SS formatting and tooltips; granularities. (R14, R26)
- Acceptance: Chart renders correct pace values and toggles. (R14)

---

## 4. Filters, Units, and Internationalization (Group D)

4.1 Date Range Filters with Presets + Persistence
- Covers: R15
- Priority: H
- Tasks: Implement presets (7d, 30d, 90d, 6mo, 1yr, YTD, All Time) and custom range; persist in URL params or session; ensure all widgets recompute. (R15)
- Acceptance: Refresh retains selection; all widgets respond consistently. (R15)

4.2 Units Toggle (Metric/Imperial) + Locale Formatting
- Covers: R16
- Priority: H
- Tasks: Global units setting affecting distances, elevations, paces, axis labels, tooltips; immediate recompute. (R16)
- Acceptance: Toggling units updates all widgets and labels correctly based on locale. (R16)

---

## 5. API & Architecture (Group E)

5.1 Summary Endpoint and/or Per-Widget Endpoints
- Covers: R17
- Priority: H
- Tasks
  - Implement `/api/me/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&units=metric|imperial` returning all widget data in one payload. (R17)
  - Optionally expose per-widget endpoints for modular clients; document schema. (R17)
- Acceptance: Dashboard loads via single call; per-widget fallbacks documented. (R17)

5.2 Module Layout
- Covers: R18
- Priority: H
- Tasks: Establish modules/namespaces: `auth`, `strava_client`, `analytics`, `presentation/ui`, `config`, `cache`, `logging`. (R18)
- Acceptance: Codebase reflects clear module separation. (R18)

---

## 6. Non-Functional Requirements (Group F)

6.1 Performance Targets and Caching Strategy
- Covers: R19, R5
- Priority: H
- Tasks: Server-side caching of summaries; avoid redundant Strava calls; lazy load charts; ensure initial render under 2s for <5,000 activities on broadband. (R19)
- Acceptance: Measured initial render < 2s with seeded typical dataset. (R19)

6.2 Accessibility (a11y)
- Covers: R20
- Priority: M
- Tasks: Keyboard navigation for all interactive controls; color palettes with sufficient contrast; legends/tooltips present; ARIA where appropriate. (R20)
- Acceptance: Keyboard-only flow works; contrast checks pass; charts have legends/tooltips. (R20)

6.3 Data Retention Controls
- Covers: R21
- Priority: M
- Tasks: Endpoint/UI to purge user’s cached data; default policy to avoid storing raw activity data longer than necessary. (R21)
- Acceptance: User can trigger deletion; cache entries removed. (R21)

6.4 Observability & Error Tracking
- Covers: R22, R3
- Priority: M
- Tasks: Structured logs with levels; error IDs; optional integration with basic error tracking; exclude PII/tokens. (R22, R3)
- Acceptance: Errors are traceable via logs without sensitive information. (R22)

---

## 7. UI Pages & Navigation (Group G)

7.1 Index/Login Page (Unauthenticated)
- Covers: R23
- Priority: H
- Tasks: Simple landing page with “Connect with Strava” button; links to privacy note; initiates OAuth. (R23)
- Acceptance: Unauthenticated users see login page and can start OAuth. (R23)

7.2 Dashboard (Authenticated)
- Covers: R24
- Priority: H
- Tasks: Layout containing seven widgets (3.1–3.7), date controls, unit toggle, sign-out control. (R24)
- Acceptance: Post-auth redirect lands here; all components render cohesively. (R24)

7.3 Error Views
- Covers: R25, R7
- Priority: H
- Tasks: Friendly error page with steps to retry or reauthenticate; map API errors to messages. (R25)
- Acceptance: On auth/API failures, users see actionable guidance. (R25)

---

## 8. Edge Cases & Platform Rules (Group H)

8.1 Weekly/Monthly Rules (ISO Week)
- Covers: R26
- Priority: H
- Tasks: Use ISO week (Mon–Sun) for weekly aggregates; document rules; monthly uses calendar months. (R26)
- Acceptance: Aggregations align with documented rules. (R26)

8.2 Private Activities Scope Handling
- Covers: R27, R3
- Priority: H
- Tasks: Include private activities only when `activity:read_all` granted; otherwise exclude and label in UI or docs. (R27)
- Acceptance: Behavior toggles based on granted scopes; UI/documentation indicates inclusion state. (R27)

8.3 Large Datasets Stability & UX
- Covers: R28, R5, R19
- Priority: M
- Tasks: Batch/paginate calls; keep UI responsive with loading states; avoid timeouts; use streaming where possible; ensure cache assists. (R28)
- Acceptance: App remains responsive on large histories; no timeouts under reasonable conditions. (R28)

---

## 9. Cross-Cutting Concerns & Technical Foundation

9.1 Technology Stack Decision (implementation-agnostic requirement)
- Supports: All
- Priority: H
- Tasks: Choose .NET 8+ backend with minimal API + server-rendered UI (Razor or lightweight SPA) to simplify OAuth secret handling and server caching.
- Acceptance: Solution skeleton created; build/run instructions in README.

9.2 Domain Models & Analytics Service
- Supports: R8–R14, R15–R16, R26
- Priority: H
- Tasks: Define domain models for Activity, Split, AggregateDay, TrendPoint; implement analytics service functions used by API and UI.
- Acceptance: Unit-tested aggregation functions for count, time, distance, pace, streaks.

9.3 Configuration & Secrets Management
- Covers: R4
- Priority: H
- Tasks: Central config binder; `.env.example`; production guidance for environment variables and secret stores.
- Acceptance: Config health-check passes and reports required keys.

9.4 Caching Layer
- Covers: R5, R19, R28, R21
- Priority: H
- Tasks: In-memory cache for single-instance; interface enabling external cache (e.g., Redis) later; cache invalidation on unit/date change; TTL defaults; delete-by-user capability. (R21)
- Acceptance: Cache hit ratio observable; deletion works per user.

9.5 Logging & Error Handling
- Covers: R22, R3
- Priority: M
- Tasks: Structured logging (e.g., Serilog-style); middleware for exception mapping; request/response IDs; PII scrubbing.
- Acceptance: Errors logged without sensitive data and with correlation IDs.

---

## 10. Milestones & Sequencing

M1 — Foundation & Auth (H)
- 1.1, 1.4, 9.1, 9.3, 9.5

M2 — Data Client & Basics (H)
- 2.1, 1.2, 2.2, 2.3, 9.2, 9.4

M3 — API Surfaces (H)
- 5.1, 5.2

M4 — Dashboard MVP (H)
- 7.1, 7.2, 3.1, 3.2, 3.3, 4.1, 4.2

M5 — Runners’ Features (M)
- 3.4, 3.5, 3.6, 3.7

M6 — NFRs & Polish (M)
- 6.1, 6.2, 6.3, 6.4, 7.3, 8.1, 8.2, 8.3

---

## 11. Acceptance Test Outline (per requirement)

- R1: Simulate OAuth flow; verify session cookie; dashboard redirect.
- R2: Force expired token; verify transparent refresh & retry.
- R3: Inspect logs and headers; ensure tokens/PII absent; cookies secure.
- R4: Boot in local and staging configs; verify callbacks and client IDs used.
- R5: Load activities across multiple pages; verify backoff and cache utilization.
- R6: Activities around midnight; verify assignment to start date in user TZ.
- R7: Simulate no data, 5xx, network errors; verify UI messages and reauth prompt.
- R8–R9: Validate pie charts with seeded dataset; labels and totals match.
- R10–R11: Heatmaps render; streaks computed; daily values accurate.
- R12: Totals, histogram bins, and PRs computed correctly for sample runs.
- R13–R14: Trends switch granularity; smoothing works; pace inversion correct.
- R15: Date presets and custom range persist in URL; all widgets recompute.
- R16: Units toggle re-renders all numbers and axes with correct formats.
- R17: Summary endpoint returns all widget data in one payload with schema docs.
- R18: Modules present and referenced by other components cleanly.
- R19: Initial render time under 2s on typical dataset; verify via profiling.
- R20: Keyboard navigation and contrast checks pass; legends/tooltips present.
- R21: User-initiated cache purge removes stored summaries.
- R22: Logs contain diagnostics without sensitive fields; error tracking optional hook.
- R23: Unauthenticated index page with Connect button.
- R24: Dashboard contains specified widgets/controls and sign-out.
- R25: Friendly error page displayed on simulated failures.
- R26: Weekly aggregates use ISO Mon–Sun; monthly by calendar months.
- R27: Behavior toggles based on `activity:read_all` scope; UI label present.
- R28: Large dataset test remains responsive; batched calls; loading states.

---

## 12. Risks & Mitigations

- Strava rate limits during backfills (R5, R28) → aggressive caching, user-driven narrower ranges, exponential backoff.
- Timezone miscalculations (R6) → rely on Strava `start_date_local` and explicit TZ conversions; add unit tests around DST boundaries.
- Pace inversion/formatting (R14) → utility library for pace math with tests.
- Performance regressions (R19) → basic profiling and budgets; monitor cache hit rate.
- Privacy compliance (R3, R27) → scoped permissions minimal; red-team log scrubbing.

---

## 13. Documentation & DevEx

- Update README with setup, env vars, OAuth registration steps, and run instructions.
- Add API schema for `/api/me/summary` and per-widget endpoints.
- Document weekly/monthly rules and cross-midnight policy.
- Provide `.env.example` and operational notes for staging/prod.

---

## 14. Requirements Traceability Matrix

| Requirement | Summary | Plan Section(s) | Priority |
|---|---|---|---|
| R1 | OAuth connect & secure token storage | 1.1 | H |
| R2 | Auto token refresh | 1.2, 2.1 | H |
| R3 | Privacy, CSRF/state, no PII/tokens in logs | 1.1, 1.3, 6.4 | H |
| R4 | Env-based OAuth config | 1.1, 1.4, 9.3 | H |
| R5 | Fetch activities, pagination, rate limits, cache | 2.1, 6.1, 9.4 | H |
| R6 | Local time aggregation & cross-midnight rule | 2.2 | H |
| R7 | Graceful handling of no data/API errors | 2.3, 7.3 | H |
| R8 | Activity count distribution | 3.1 | H |
| R9 | Time distribution by type | 3.2 | H |
| R10 | Workout heatmap & streaks | 3.3 | H |
| R11 | Running heatmap & streaks | 3.4 | M |
| R12 | Running stats & PRs | 3.5 | H |
| R13 | Mileage trend | 3.6 | H |
| R14 | Pace trend | 3.7 | M |
| R15 | Date filters with presets & persistence | 4.1 | H |
| R16 | Units toggle metric/imperial | 4.2 | H |
| R17 | Single summary endpoint (or per-widget) | 5.1 | H |
| R18 | Clear module layout | 5.2, 9.x | H |
| R19 | Performance under 2s | 6.1, 9.4 | H |
| R20 | Accessibility | 6.2 | M |
| R21 | Cached data removal policy | 6.3, 9.4 | M |
| R22 | Observability/logging | 6.4, 9.5 | M |
| R23 | Index/login page | 7.1 | H |
| R24 | Dashboard with widgets & controls | 7.2 | H |
| R25 | Error views | 7.3 | H |
| R26 | ISO weeks / monthly rules | 3.3, 3.4, 3.6, 3.7, 8.1 | H |
| R27 | Private activities per scope | 8.2, 1.3 | H |
| R28 | Large dataset stability | 2.1, 8.3, 6.1 | M |

Verification: Each R# is represented at least once above; see Section 11 for acceptance outlines.

---

## 15. Deliverables for Step 2

- This `docs/plan.md` file.
- README updates queued in a subsequent step per Section 13.
