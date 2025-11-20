# Requirements Document

## Introduction

The Strava Activity Analyzer is a web application that authenticates with a user’s Strava account and presents interactive analytics and visualizations for their activities (runs, rides, swims, etc.). It is implementation-agnostic and can be built with any language or tech stack. The app focuses on read-only analytics, providing charts, trends, heatmaps, and statistics with configurable units and date filters. Mobile apps, data mutation on Strava, and social features are out of scope.

## Requirements

### Group A — Authentication and Security

1.
> As a user, I want to securely connect my Strava account so that the app can access my activities to generate analytics.

> WHEN I click "Connect with Strava" and complete the OAuth2 Authorization Code flow (with PKCE or server-side secret) THEN the system SHALL store access and refresh tokens securely server-side and redirect me to the dashboard.

2.
> As a user, I want the app to refresh tokens automatically so that my session remains active without manual re-login.

> WHEN a request fails due to token expiry (or is nearing expiry) THEN the system SHALL use the refresh token to obtain a new access token transparently, retry the request, and avoid interrupting my session.

3.
> As a user, I want my private data to remain protected so that my information is not leaked or misused.

> WHEN authentication completes THEN the system SHALL keep tokens and client secrets off the browser, use secure cookies/sessions, avoid logging PII/tokens, and include CSRF protection (OAuth state parameter). The system SHALL comply with Strava API Terms of Service.

4.
> As a system operator, I want to configure OAuth credentials and callbacks so that the app works in local, staging, and production environments.

> WHEN the app starts in a given environment THEN the system SHALL read configuration (client ID/secret, redirect URIs, base URL, session secret) from environment variables and use the registered callback for that environment.

### Group B — Data Acquisition and Handling

5.
> As an authenticated user, I want my Strava activities fetched reliably so that the dashboard can display complete and up-to-date analytics.

> WHEN the dashboard needs activity data THEN the system SHALL call Strava’s Activities API with pagination, respect rate limits with backoff, and cache responses to minimize calls while keeping data current.

6.
> As a user, I want correct local-time aggregations so that daily/weekly metrics match my timezone.

> WHEN activities are processed THEN the system SHALL normalize timestamps to the user’s timezone and assign activities spanning midnight to the start date (documented rule).

7.
> As a user, I want the app to handle no data or API failures gracefully so that I understand what happened and what to do next.

> WHEN a date range yields no activities OR API/network errors occur OR rate limits are exceeded THEN the system SHALL show friendly messages with retry affordances and SHALL not crash; if token is revoked/expired the system SHALL prompt re-auth.

### Group C — Dashboard and Widgets

8.
> As a user, I want to see my activity count distribution so that I understand how I spend my training time across types.

> WHEN the dashboard loads with a date filter THEN the system SHALL show counts per activity type with percentage labels suitable for a pie/donut chart.

9.
> As a user, I want to see time distribution by activity type so that I know where my training time goes.

> WHEN the dashboard loads with a date filter THEN the system SHALL aggregate total moving time per activity type (HH:MM) for pie/donut visualization.

10.
> As a user, I want a workout heatmap so that I can visualize activity frequency and streaks.

> WHEN activities are aggregated by date within the filter THEN the system SHALL render a calendar-like grid colored by daily activity count (or total moving time) and SHALL compute current and longest streaks of days with at least one activity.

11.
> As a runner, I want a running heatmap so that I can see running mileage intensity and streaks.

> WHEN runs are aggregated by date THEN the system SHALL render a daily grid with intensity proportional to running distance and SHALL compute current and longest running streaks.

12.
> As a runner, I want running stats and PRs so that I can track progress and achievements.

> WHEN the dashboard loads THEN the system SHALL display totals (total runs, runs ≥10K, total distance, average pace), a histogram of run distances (default bins: 1 mile up to 10 miles, extendable), and PRs (fastest mile, fastest 10K, longest run, most elevation gain) computed from available activity/split data.

13.
> As a runner, I want a mileage trend so that I can see distance over time.

> WHEN a granularity (daily|weekly|monthly) is selected THEN the system SHALL plot distance aggregates with tooltips and optional smoothing (default 7-day moving average for daily).

14.
> As a runner, I want a pace trend so that I can evaluate training intensity over time.

> WHEN a granularity (daily|weekly|monthly) is selected THEN the system SHALL plot average pace (MM:SS) derived from speed, handling pace inversion correctly, with tooltips.

### Group D — Filters, Units, and Internationalization

15.
> As a user, I want to filter by date range so that I can focus on specific training windows.

> WHEN I choose a preset (7d, 30d, 90d, 6mo, 1yr, YTD, All Time) or a custom range THEN the system SHALL recompute all widgets consistently and persist the selection in URL or session so refresh retains context.

16.
> As a user, I want to switch between metric and imperial units so that numbers match my preference.

> WHEN I toggle units THEN the system SHALL immediately convert all distances, elevations, times/pace formats, and axis labels across all widgets, respecting locale formatting.

### Group E — API and Architecture (Optional when SPA + API)

17.
> As a frontend client, I want a single summary endpoint so that I can load the dashboard efficiently.

> WHEN the client requests `/api/me/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&units=metric|imperial` THEN the system SHALL return all widget data in one payload; alternatively, separate endpoints per widget SHALL be available as documented.

18.
> As a developer, I want a clear module layout so that the system is maintainable.

> WHEN reviewing the codebase THEN there SHALL be modules for auth (OAuth redirects, token exchange, refresh), Strava client (rate-limit, retry), analytics service (aggregations/metrics), presentation layer (charts/tables), and configuration management.

### Group F — Non-Functional Requirements

19.
> As a user, I want fast load times so that the dashboard feels responsive.

> WHEN accessing the dashboard with typical datasets (<5,000 activities) on broadband THEN the initial render SHALL complete under 2 seconds; caching SHALL be used to avoid refetching where possible.

20.
> As a user, I want an accessible UI so that I can navigate and interpret charts regardless of ability.

> WHEN using keyboard-only navigation THEN all interactive controls SHALL be reachable; chart color palettes SHALL meet contrast guidelines and include legends/tooltips.

21.
> As a privacy-conscious user, I want control over my cached data so that unnecessary retention is avoided.

> WHEN I request data removal THEN the system SHALL delete cached activity data associated with my account; by default, raw activity data SHALL not be stored longer than necessary.

22.
> As an operator, I want observability so that I can troubleshoot issues.

> WHEN errors occur THEN the system SHALL log essential diagnostics without PII or tokens and support basic error tracking with adjustable log levels.

### Group G — UI Pages and Navigation

23.
> As a user, I want a simple entry point so that I can start quickly.

> WHEN I open the site unauthenticated THEN I SHALL see an index/login page with a “Connect with Strava” button leading to the OAuth flow.

24.
> As an authenticated user, I want a consolidated dashboard so that I can view all analytics in one place.

> WHEN I return from OAuth THEN I SHALL land on the dashboard containing the seven widgets, date controls, unit toggle, and a sign-out control.

25.
> As a user, I want helpful error views so that I understand problems.

> WHEN auth or API errors occur THEN the system SHALL display a friendly error page with steps to retry or reauthenticate.

### Group H — Edge Cases and Rules

26.
> As a user, I want consistent weekly/monthly rules so that trends are comparable.

> WHEN showing weekly aggregates THEN the system SHALL use ISO week (Mon–Sun) unless configured otherwise and SHALL document the chosen rule; monthly aggregates SHALL use calendar months.

27.
> As a user, I want private activities handled per my permissions so that my analysis is complete and compliant.

> WHEN scope `activity:read_all` is granted THEN private activities SHALL be included; otherwise, they SHALL be excluded and labeled accordingly in UI or documentation.

28.
> As a user with many activities, I want the app to remain stable so that analysis completes.

> WHEN datasets are large THEN the system SHALL paginate and batch API calls, apply caching, and avoid timeouts; UI SHALL remain responsive and show loading states.
