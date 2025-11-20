Transform the provided high-level requirements into a requirements doc for spec-driven development.

Step 1: Create `docs/requirements.md`
- Title: **Requirements Document**
- Introduction: Summarize the application purpose and key functionality.
- Requirements section:
    - Use sequential numbering (1, 2, 3, …).
    - Each requirement must include:
        - **User Story** in the format:
          > As a user, I want [goal] so that [benefit/reason]
        - **Acceptance Criteria** in the format:
          > WHEN [condition] THEN the system SHALL [expected behavior]
- Guidelines:
    - Focus on user goals and benefits.
    - Make acceptance criteria specific, testable, and precise.
    - Cover normal flows, edge cases, error handling, persistence, and UI/UX.
    - Group related requirements logically.

# Strava Activity Analyzer Requirements

This document specifies everything needed to recreate the Strava Activity Analyzer in any programming language and tech stack. It is intentionally implementation-agnostic and describes scope, user journeys, functional and non-functional requirements, data contracts, and acceptance criteria.

Last updated: 2025-11-20

## 1. Purpose and Scope# Strava Activity Analyzer — Language-Agnostic Requirements

This document specifies everything needed to recreate the Strava Activity Analyzer in any programming language and tech stack. It is intentionally implementation-agnostic and describes scope, user journeys, functional and non-functional requirements, data contracts, and acceptance criteria.

Last updated: 2025-11-17

## 1. Purpose and Scope

Build a web application that authenticates with a user’s Strava account and presents interactive analytics and visualizations about their activities (runs, rides, swims, etc.).

Out of scope:
- Writing a mobile app (a responsive web app is sufficient).
- Mutating user data on Strava (read-only analytics).
- Social/leaderboard features.

## 2. Stakeholders and Roles

- End User (Athlete): Connects their Strava account and views their personal stats and charts.
- System Admin/Operator: Configures keys, monitors health, manages deployment.

All authenticated users see only their own data.

## 3. High-Level User Journeys

1) Connect account
- User opens the site → clicks "Connect with Strava" → OAuth flow → consent → redirect back to app.

2) View dashboard
- After authentication, user lands on a dashboard showing: activity count distribution, time distribution, workout heatmap, running heatmap, running stats, mileage trend, and pace trend.

3) Filter by date range
- User applies a predefined or custom date range; all widgets recompute based on the active window.

4) Sign out
- User can end their session; tokens are invalidated server-side where applicable.

## 4. Functional Requirements

4.1 Authentication (OAuth2 Authorization Code)
- The app MUST support Strava OAuth2 using Authorization Code flow with PKCE or client secret (server-side).
- Required scopes: read activities without write permissions (typically `read`, `activity:read_all` may be needed for private activities depending on user choice). Display requested scopes clearly.
- Store access and refresh tokens securely; handle token refresh automatically.
- Support local callback URI for development and a configurable production callback.

4.2 Data Acquisition from Strava
- Fetch activities for the authenticated user using Strava’s public API.
- Respect Strava rate limits; implement backoff and user-friendly errors when limits are reached.
- Cache responses where appropriate to reduce API calls (in-memory or persistent cache).
- Timezone handling: normalize activity timestamps to user timezone for daily/weekly aggregations.

4.3 Dashboard Widgets (all recomputed under active date filter)
- Activity Count Distribution: counts per activity type with percentage labels. Output suitable for a pie/donut chart.
- Time Distribution: total moving time aggregated by activity type (format HH:MM). Output suitable for a pie/donut chart.
- Workout Heatmap: calendar-like grid covering all activities; intensity coloration (e.g., by number of activities or time). Include streak metrics (current and longest streak of any-activity days).
- Running Heatmap: calendar-like daily grid showing running mileage intensity with running streak metrics.
- Running Stats:
    - Totals: total runs, runs >= 10K, total distance (mi/km), average pace (MM:SS per mile/km).
    - Distribution: histogram of run distances from 0–10 miles in 1-mile bins (or 0–16 km in 1-km bins) with ability to extend range if data exceeds.
    - Personal Records (computed from fetched activities): fastest mile, fastest 10K, longest run by distance, most elevation gain in a run.
- Mileage Trend: line/area chart for daily, weekly, and monthly running mileage aggregates with smoothing and tooltips.
- Pace Trend: line chart for daily, weekly, and monthly average running pace (MM:SS). Handle pace inversion when converting from speed.

4.4 Date Filter Controls
- Presets: 7 days, 30 days, 90 days, 6 months, 1 year, YTD, All Time.
- Custom range: start and end date pickers. Persist selection in URL or session so refresh keeps context.

4.5 Internationalization and Units
- Units configurable between imperial and metric. Default can be inferred from user locale or explicit preference.
- Date and number formats should respect locale when possible.

4.6 Error Handling and Empty States
- Gracefully handle:
    - No activities in range
    - API errors, network failures
    - Rate limit exceeded
    - Token revoked/expired (prompt re-auth)
- Provide helpful messages and retry affordances.

4.7 Security
- Never expose client secrets to the browser; keep tokens server-side.
- CSRF protection for state-changing endpoints (OAuth callback state parameter required).
- Store minimal PII; avoid logging tokens or personal data.
- Comply with Strava API Terms of Service.

## 5. Architecture (Reference)

You may implement as:
- Server-Rendered Web (e.g., templates) or
- SPA frontend + backend API.

Minimum components regardless of stack:
- Auth module handling OAuth redirects, token exchange, refresh.
- Strava API client with rate-limit and retry logic.
- Analytics service computing aggregates and metrics from raw activities.
- Presentation layer rendering charts and tables.
- Configuration management for secrets and environment variables.

## 6. External Interfaces

6.1 Strava OAuth2
- Authorization endpoint: per Strava docs.
- Token endpoint: per Strava docs.
- Redirect URI(s): configurable; must be registered in Strava app settings.

6.2 Strava Activities API
- Use activities listing endpoints to retrieve user activities with pagination.
- Required fields from each activity (at minimum):
    - id, name, type, start_date_local, timezone
    - distance (meters), moving_time (seconds), elapsed_time (seconds)
    - total_elevation_gain (meters), average_speed (m/s)
    - splits/segments or laps if available for pace calculations (optional, may require additional endpoints)
    - visibility/private flag to respect user privacy settings

6.3 Web UI
- Runs on HTTP(S). Default local dev at http://localhost:8080 or configurable.
- Single page (dashboard) plus index/login and error pages is sufficient.

## 7. Data Model (Logical)

Activity (normalized fields):
- activityId: string | number
- type: enum [Run, Ride, Swim, Walk, Hike, …]
- startTime: datetime (with timezone)
- distance: meters
- movingTime: seconds
- elapsedTime: seconds
- elevationGain: meters
- avgSpeed: m/s (derive pace)
- isPrivate: boolean

Derived entities:
- DailyAggregate { date, activityCount, totalTimeSec, runDistanceMeters, runPaceSecPerUnit, … }
- DistributionBin { label, lowerBound, upperBound, count }
- TrendPoint { periodStart, value }

Unit conversion helpers must convert meters↔miles/kilometers, seconds↔HH:MM:SS, m/s↔pace.

## 8. Computation Rules

- Activity Count Distribution: group by type over filtered range.
- Time Distribution: sum movingTime by type over filtered range.
- Workout Heatmap: for each date, intensity = count of activities (or total movingTime). Define color scale thresholds (e.g., quantiles or fixed buckets).
- Running Heatmap: same grid but intensity = runDistance for that date.
- Running Stats:
    - Average pace = total moving time for runs / total distance for runs.
    - 10K+ runs count: runs with distance ≥ 10,000 meters.
    - Histogram bins: configurable size and max; default 1 mile bins up to 10 miles.
    - PRs: compute from single-activity metrics; if split data is available, prefer precise segment distances (e.g., exact 1 mile or 10K). If not, approximate from average speed over the activity.
- Trends:
    - Daily: sum distance per day.
    - Weekly: ISO week (Mon–Sun) or locale-based; document chosen rule consistently.
    - Monthly: calendar months.
    - Smoothing: apply moving average (window size configurable; default 7 for daily).

## 9. Configuration

Environment variables (names are suggestions; adapt to your platform):
- STRAVA_CLIENT_ID
- STRAVA_CLIENT_SECRET (server only)
- STRAVA_REDIRECT_URI (e.g., http://localhost:8080/login/oauth2/code/strava)
- APP_BASE_URL (e.g., http://localhost:8080)
- SESSION_SECRET or equivalent
- LOG_LEVEL (e.g., info, debug)

App settings:
- Default units: metric|imperial
- Cache TTLs for API responses
- Rate limit thresholds and backoff strategy

## 10. Non-Functional Requirements

- Performance: Initial dashboard render under 2s on broadband with typical data sets (<5,000 activities). Use caching to avoid refetching.
- Reliability: Handle token refresh seamlessly; do not leave the user stranded on 401s.
- Accessibility: Keyboard navigable, color contrast compliant for charts; provide tooltips and legends.
- Security: HTTPS in production, secure cookies, no secrets in client.
- Privacy: Do not store raw activity data longer than necessary; at minimum, provide a mechanism to delete cached data upon user request.
- Observability: Basic request logging and error tracking.

## 11. UI Requirements

Pages:
- Index/Login page: “Connect with Strava” button.
- Dashboard: contains the seven widgets listed in 4.3, date range controls, unit toggle, and a sign-out control.
- Error page: friendly messages for auth/API errors.

Charts:
- Any modern charting lib is acceptable; must support tooltips and responsive layout.
- Color palettes should be accessible and consistent across charts.

## 12. API Endpoints (if building a backend API)

Example (adapt names to your stack):
- GET /api/me/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&units=metric|imperial → returns all widget data in one payload for efficiency; or separate endpoints per widget:
    - GET /api/me/activity-count
    - GET /api/me/time-distribution
    - GET /api/me/heatmap/workouts
    - GET /api/me/heatmap/runs
    - GET /api/me/running-stats
    - GET /api/me/trends/mileage?granularity=daily|weekly|monthly
    - GET /api/me/trends/pace?granularity=daily|weekly|monthly

Authentication: session cookie or bearer token; secure per your architecture.

## 13. Acceptance Criteria and Test Ideas

Functional ACs:
- AC1: After OAuth, the dashboard loads and shows non-empty widgets for users with activities.
- AC2: Date range presets update all widgets consistently within 300ms after data is available from cache.
- AC3: Unit toggle switches all numeric displays and axes.
- AC4: Handling no-data range shows empty states without errors.
- AC5: Token refresh occurs automatically before expiry or on 401, without user intervention.

Edge Cases:
- Activities spanning midnight (assign to start date; document rule).
- Private activities included/excluded based on scope.
- Very large datasets (pagination, batching, caching verified).

Tests:
- OAuth callback integration test (mock Strava endpoints).
- Aggregation unit tests for each metric.
- Rate-limit and retry logic tests.
- UI e2e for date filters and widget rendering.

## 14. Deployment Notes

- Provide environment-specific configuration files/secrets management.
- Support local dev (localhost), staging, and production.
- Ensure callback URLs match environment and are registered with Strava.

## 15. Glossary

- Pace: time per distance unit (e.g., minutes per mile or per km).
- Moving Time: time excluding pauses as defined by Strava.
- Streak: consecutive days with at least one qualifying activity.

---

Implementation Tips (non-binding):
- Backend: any framework with OAuth2 support and HTTP client (Java/Spring, Node/Express, Python/FastAPI/Django, Go, Ruby).
- Frontend: any modern UI lib; charts with Chart.js, ECharts, D3, or similar.
- Storage: optional persistent cache (Redis, SQLite) or in-memory if rate limits allow.


Build a web application that authenticates with a user’s Strava account and presents interactive analytics and visualizations about their activities (runs, rides, swims, etc.).

Out of scope:
- Writing a mobile app (a responsive web app is sufficient).
- Mutating user data on Strava (read-only analytics).
- Social/leaderboard features.

## 2. Stakeholders and Roles

- End User (Athlete): Connects their Strava account and views their personal stats and charts.
- System Admin/Operator: Configures keys, monitors health, manages deployment.

All authenticated users see only their own data.

## 3. High-Level User Journeys

1) Connect account
- User opens the site → clicks "Connect with Strava" → OAuth flow → consent → redirect back to app.

2) View dashboard
- After authentication, user lands on a dashboard showing: activity count distribution, time distribution, workout heatmap, running heatmap, running stats, mileage trend, and pace trend.

3) Filter by date range
- User applies a predefined or custom date range; all widgets recompute based on the active window.

4) Sign out
- User can end their session; tokens are invalidated server-side where applicable.

## 4. Functional Requirements

4.1 Authentication (OAuth2 Authorization Code)
- The app MUST support Strava OAuth2 using Authorization Code flow with PKCE or client secret (server-side).
- Required scopes: read activities without write permissions (typically `read`, `activity:read_all` may be needed for private activities depending on user choice). Display requested scopes clearly.
- Store access and refresh tokens securely; handle token refresh automatically.
- Support local callback URI for development and a configurable production callback.

4.2 Data Acquisition from Strava
- Fetch activities for the authenticated user using Strava’s public API.
- Respect Strava rate limits; implement backoff and user-friendly errors when limits are reached.
- Cache responses where appropriate to reduce API calls (in-memory or persistent cache).
- Timezone handling: normalize activity timestamps to user timezone for daily/weekly aggregations.

4.3 Dashboard Widgets (all recomputed under active date filter)
- Activity Count Distribution: counts per activity type with percentage labels. Output suitable for a pie/donut chart.
- Time Distribution: total moving time aggregated by activity type (format HH:MM). Output suitable for a pie/donut chart.
- Workout Heatmap: calendar-like grid covering all activities; intensity coloration (e.g., by number of activities or time). Include streak metrics (current and longest streak of any-activity days).
- Running Heatmap: calendar-like daily grid showing running mileage intensity with running streak metrics.
- Running Stats:
    - Totals: total runs, runs >= 10K, total distance (mi/km), average pace (MM:SS per mile/km).
    - Distribution: histogram of run distances from 0–10 miles in 1-mile bins (or 0–16 km in 1-km bins) with ability to extend range if data exceeds.
    - Personal Records (computed from fetched activities): fastest mile, fastest 10K, longest run by distance, most elevation gain in a run.
- Mileage Trend: line/area chart for daily, weekly, and monthly running mileage aggregates with smoothing and tooltips.
- Pace Trend: line chart for daily, weekly, and monthly average running pace (MM:SS). Handle pace inversion when converting from speed.

4.4 Date Filter Controls
- Presets: 7 days, 30 days, 90 days, 6 months, 1 year, YTD, All Time.
- Custom range: start and end date pickers. Persist selection in URL or session so refresh keeps context.

4.5 Internationalization and Units
- Units configurable between imperial and metric. Default can be inferred from user locale or explicit preference.
- Date and number formats should respect locale when possible.

4.6 Error Handling and Empty States
- Gracefully handle:
    - No activities in range
    - API errors, network failures
    - Rate limit exceeded
    - Token revoked/expired (prompt re-auth)
- Provide helpful messages and retry affordances.

4.7 Security
- Never expose client secrets to the browser; keep tokens server-side.
- CSRF protection for state-changing endpoints (OAuth callback state parameter required).
- Store minimal PII; avoid logging tokens or personal data.
- Comply with Strava API Terms of Service.

## 5. Architecture (Reference)

You may implement as:
- Server-Rendered Web (e.g., templates) or
- SPA frontend + backend API.

Minimum components regardless of stack:
- Auth module handling OAuth redirects, token exchange, refresh.
- Strava API client with rate-limit and retry logic.
- Analytics service computing aggregates and metrics from raw activities.
- Presentation layer rendering charts and tables.
- Configuration management for secrets and environment variables.

## 6. External Interfaces

6.1 Strava OAuth2
- Authorization endpoint: per Strava docs.
- Token endpoint: per Strava docs.
- Redirect URI(s): configurable; must be registered in Strava app settings.

6.2 Strava Activities API
- Use activities listing endpoints to retrieve user activities with pagination.
- Required fields from each activity (at minimum):
    - id, name, type, start_date_local, timezone
    - distance (meters), moving_time (seconds), elapsed_time (seconds)
    - total_elevation_gain (meters), average_speed (m/s)
    - splits/segments or laps if available for pace calculations (optional, may require additional endpoints)
    - visibility/private flag to respect user privacy settings

6.3 Web UI
- Runs on HTTP(S). Default local dev at http://localhost:8080 or configurable.
- Single page (dashboard) plus index/login and error pages is sufficient.

## 7. Data Model (Logical)

Activity (normalized fields):
- activityId: string | number
- type: enum [Run, Ride, Swim, Walk, Hike, …]
- startTime: datetime (with timezone)
- distance: meters
- movingTime: seconds
- elapsedTime: seconds
- elevationGain: meters
- avgSpeed: m/s (derive pace)
- isPrivate: boolean

Derived entities:
- DailyAggregate { date, activityCount, totalTimeSec, runDistanceMeters, runPaceSecPerUnit, … }
- DistributionBin { label, lowerBound, upperBound, count }
- TrendPoint { periodStart, value }

Unit conversion helpers must convert meters↔miles/kilometers, seconds↔HH:MM:SS, m/s↔pace.

## 8. Computation Rules

- Activity Count Distribution: group by type over filtered range.
- Time Distribution: sum movingTime by type over filtered range.
- Workout Heatmap: for each date, intensity = count of activities (or total movingTime). Define color scale thresholds (e.g., quantiles or fixed buckets).
- Running Heatmap: same grid but intensity = runDistance for that date.
- Running Stats:
    - Average pace = total moving time for runs / total distance for runs.
    - 10K+ runs count: runs with distance ≥ 10,000 meters.
    - Histogram bins: configurable size and max; default 1 mile bins up to 10 miles.
    - PRs: compute from single-activity metrics; if split data is available, prefer precise segment distances (e.g., exact 1 mile or 10K). If not, approximate from average speed over the activity.
- Trends:
    - Daily: sum distance per day.
    - Weekly: ISO week (Mon–Sun) or locale-based; document chosen rule consistently.
    - Monthly: calendar months.
    - Smoothing: apply moving average (window size configurable; default 7 for daily).

## 9. Configuration

Environment variables (names are suggestions; adapt to your platform):
- STRAVA_CLIENT_ID
- STRAVA_CLIENT_SECRET (server only)
- STRAVA_REDIRECT_URI (e.g., http://localhost:8080/login/oauth2/code/strava)
- APP_BASE_URL (e.g., http://localhost:8080)
- SESSION_SECRET or equivalent
- LOG_LEVEL (e.g., info, debug)

App settings:
- Default units: metric|imperial
- Cache TTLs for API responses
- Rate limit thresholds and backoff strategy

## 10. Non-Functional Requirements

- Performance: Initial dashboard render under 2s on broadband with typical data sets (<5,000 activities). Use caching to avoid refetching.
- Reliability: Handle token refresh seamlessly; do not leave the user stranded on 401s.
- Accessibility: Keyboard navigable, color contrast compliant for charts; provide tooltips and legends.
- Security: HTTPS in production, secure cookies, no secrets in client.
- Privacy: Do not store raw activity data longer than necessary; at minimum, provide a mechanism to delete cached data upon user request.
- Observability: Basic request logging and error tracking.

## 11. UI Requirements

Pages:
- Index/Login page: “Connect with Strava” button.
- Dashboard: contains the seven widgets listed in 4.3, date range controls, unit toggle, and a sign-out control.
- Error page: friendly messages for auth/API errors.

Charts:
- Any modern charting lib is acceptable; must support tooltips and responsive layout.
- Color palettes should be accessible and consistent across charts.

## 12. API Endpoints (if building a backend API)

Example (adapt names to your stack):
- GET /api/me/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&units=metric|imperial → returns all widget data in one payload for efficiency; or separate endpoints per widget:
    - GET /api/me/activity-count
    - GET /api/me/time-distribution
    - GET /api/me/heatmap/workouts
    - GET /api/me/heatmap/runs
    - GET /api/me/running-stats
    - GET /api/me/trends/mileage?granularity=daily|weekly|monthly
    - GET /api/me/trends/pace?granularity=daily|weekly|monthly

Authentication: session cookie or bearer token; secure per your architecture.

## 13. Acceptance Criteria and Test Ideas

Functional ACs:
- AC1: After OAuth, the dashboard loads and shows non-empty widgets for users with activities.
- AC2: Date range presets update all widgets consistently within 300ms after data is available from cache.
- AC3: Unit toggle switches all numeric displays and axes.
- AC4: Handling no-data range shows empty states without errors.
- AC5: Token refresh occurs automatically before expiry or on 401, without user intervention.

Edge Cases:
- Activities spanning midnight (assign to start date; document rule).
- Private activities included/excluded based on scope.
- Very large datasets (pagination, batching, caching verified).

Tests:
- OAuth callback integration test (mock Strava endpoints).
- Aggregation unit tests for each metric.
- Rate-limit and retry logic tests.
- UI e2e for date filters and widget rendering.

## 14. Deployment Notes

- Provide environment-specific configuration files/secrets management.
- Support local dev (localhost), staging, and production.
- Ensure callback URLs match environment and are registered with Strava.

## 15. Glossary

- Pace: time per distance unit (e.g., minutes per mile or per km).
- Moving Time: time excluding pauses as defined by Strava.
- Streak: consecutive days with at least one qualifying activity.

---

Implementation Tips (non-binding):
- Backend: any framework with OAuth2 support and HTTP client (framework provided by Rider).
- Frontend: any modern UI lib; charts with Chart.js, ECharts, D3, or similar.
- Storage: optional persistent cache (Redis, SQLite) or in-memory if rate limits allow.
