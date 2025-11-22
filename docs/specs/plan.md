# Implementation Plan

This document outlines the development phases for the Strava Activity Analyzer, mapping technical tasks to the requirements defined in `docs/specs/requirements.md`.

## Phase 1: Infrastructure & Authentication
**Goal:** Establish the project structure and enable users to securely connect their Strava accounts.

| Priority | Task Description | Requirement ID |
| :--- | :--- | :--- |
| **High** | **Project Initialization**: Set up the repository, build system, and choose the technology stack (Frontend + Backend/API). | N/A |
| **High** | **OAuth2 Client Implementation**: Implement the backend logic to handle the OAuth2 handshake (redirect to Strava, handle callback). | [Req 1] |
| **High** | **Token Exchange & Storage**: Securely exchange authorization codes for access/refresh tokens and store them server-side (encrypted session or database). | [Req 1], [Req 2] |
| **High** | **Session Management**: Implement session creation upon login and automatic token refreshing when access tokens expire. | [Req 2] |
| **High** | **Sign Out Flow**: Implement the endpoint to invalidate sessions and clear local storage. | [Req 2] |

## Phase 2: Data Ingestion & Core Logic
**Goal:** Fetch, normalize, and process user activity data from Strava.

| Priority | Task Description | Requirement ID |
| :--- | :--- | :--- |
| **High** | **Strava API Client**: Create a typed client to fetch activities from Strava's API. | [Req 3] |
| **High** | **Pagination & Rate Limiting**: Implement logic to handle pagination (fetching all history) and respect API rate limits (backoff/retry). | [Req 3] |
| **High** | **Data Normalization**: Normalize activity data (timestamps to local timezone, units to internal standard) for consistent aggregation. | [Req 3] |
| **High** | **In-Memory Data Store/Cache**: Implement a temporary storage mechanism to hold fetched activities during the user's session to avoid re-fetching. | [Req 3], [Req 11] |
| **High** | **Unit Conversion Service**: Create a utility service to handle conversions between Metric (km, m/s) and Imperial (mi, min/mi). Default to imperial units with toggle to switch. | [Req 9] |

## Phase 3: Dashboard Framework & Basic Widgets
**Goal:** Create the UI skeleton and implement the fundamental descriptive statistics.

| Priority | Task Description | Requirement ID |
| :--- | :--- | :--- |
| **High** | **Dashboard Layout**: Create the main responsive grid layout for the dashboard. | N/A |
| **High** | **Global State Management**: Set up state for `Activities`, `DateRange`, and `UnitPreference`. | [Req 8], [Req 9] |
| **High** | **Date Filter Controls**: Implement UI for selecting presets (30 days, YTD, etc.) and custom date ranges. | [Req 8] |
| **High** | **Running Statistics Component**: Implement the logic and UI to calculate totals (count, distance) and find PRs (fastest 10k, etc.). | [Req 6] |
| **Medium** | **Overview Tab**: Implement totals summary (Total Activities, Total Moving Time) and Activity Count Distribution pie chart with data labels on slices > 5%. | [Req 4] |
| **Medium** | **Time Distribution Tab**: Implement Time Distribution pie chart with data labels on slices > 5%. | [Req 4] |
| **Medium** | **Distance Histogram**: Implement the bar chart showing the distribution of run distances (1-mile bins). | [Req 6] |

## Phase 4: Advanced Visualization & Trends
**Goal:** Implement complex visualizations including heatmaps and time-series trends.

| Priority | Task Description | Requirement ID |
| :--- | :--- | :--- |
| **Medium** | **Heatmap Component Logic**: Develop the algorithm to map daily activity intensity to a calendar grid. | [Req 5] |
| **Medium** | **Heatmap Tab with Mode Toggle**: Render single heatmap tab with toggle between "All Activities" (intensity by total time per day) and "Running Only" (intensity by distance). Include streak calculation (current/longest streak). | [Req 5] |
| **Low** | **Trend Calculation Engine**: Implement logic to aggregate data by day/week/month for trend lines. | [Req 7] |
| **Low** | **Trends Tab with Mode Toggle**: Render single trends tab with toggle between "All Activities" and "Running Only". Display line charts for distance and pace over time with smoothing (moving average) and aggregation options. | [Req 7] |

## Phase 5: User Experience & Quality Assurance
**Goal:** Polish the application, handle edge cases, and ensure performance.

| Priority | Task Description | Requirement ID |
| :--- | :--- | :--- |
| **Medium** | **Error Handling UI**: Implement user-friendly error pages/toasts for API failures or network issues. | [Req 10] |
| **Medium** | **Empty States**: Design and implement specific UI for "No activities found" in a selected range. | [Req 10] |
| **Medium** | **Performance Optimization**: optimize chart re-rendering and data processing to meet the 300ms interaction threshold. | [Req 11] |
| **Low** | **Persist User Settings**: Save unit preference and last selected date range to local storage or URL query params. | [Req 8], [Req 9] |
| **High** | **Security Review**: Audit token storage and ensure no client secrets are exposed. | [Req 1], [Req 2] |
