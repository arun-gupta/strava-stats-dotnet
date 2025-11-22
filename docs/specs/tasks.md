# Technical Task List

This document tracks the step-by-step technical tasks required to build the Strava Activity Analyzer. Each task is linked to the high-level plan and specific requirements.

> Checklist legend
> - [x] = task fully completed (meets acceptance criteria)
> - [ ] = task not completed
> - “Started” notes indicate work is in progress but the task remains unchecked until finished

## Phase 1: Infrastructure & Authentication

- [x] **1.1 Initialize Project Repository**
  - _Plan Item:_ Project Initialization
  - _Req ID:_ N/A
  - **Details:** Initialize git repo, create solution/project structure (e.g., ASP.NET Core Web API + React/Vue/Blazor or MVC), configure .gitignore.
  - Completed on 2025-11-21: Added `.gitignore` (Dotnet/Node/IDE), created `.sln` and initial ASP.NET Core Web API project at `src/StravaStats.Api` with a `/health` endpoint and Swagger in Development.

- [x] **1.2 Configure Environment Variables & Secrets**
  - _Plan Item:_ Project Initialization
  - _Req ID:_ [Req 1]
  - **Details:** specific configuration for `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `SESSION_SECRET` (or equivalent). Ensure secrets are excluded from source control.
  - Completed on 2025-11-21: Added strongly-typed options (`StravaOptions`, `SecurityOptions`), bound to config. Mapped flat env vars to section keys, added `.env.example`, and documented `dotnet user-secrets` usage in README. `.env` already gitignored.

- [x] **1.3 Create OAuth2 Controller/Handler**
  - _Plan Item:_ OAuth2 Client Implementation
  - _Req ID:_ [Req 1]
  - **Details:** Implement `/auth/login` endpoint to redirect user to Strava Authorization URL with scopes `read,activity:read_all`.
  - Completed on 2025-11-21: Added `GET /auth/login` which validates `Strava:ClientId`, computes `redirect_uri` (default to `{scheme}://{host}/auth/callback` unless overridden by query), and redirects to `https://www.strava.com/oauth/authorize` with `response_type=code` and required scopes.

- [x] **1.4 Implement Token Exchange Logic**
  - _Plan Item:_ Token Exchange & Storage
  - _Req ID:_ [Req 1]
  - **Details:** Implement `/auth/callback` to receive the `code` and exchange it for `access_token` and `refresh_token` using Strava's `/oauth/token` endpoint.
  - Completed on 2025-11-21: Added `GET /auth/callback` which validates `code`, posts to `https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `grant_type=authorization_code`, and returns the raw JSON response for verification (temporary until Task 1.5 stores tokens securely).

- [x] **1.5 Implement Secure Token Storage**
  - _Plan Item:_ Token Exchange & Storage
  - _Req ID:_ [Req 2]
  - **Details:** Create a service to store tokens securely (e.g., HTTP-only encrypted cookies, server-side session store, or database). Ensure client browser never sees the raw access token.
  - Completed on 2025-11-21: Added server-side session via `AddDistributedMemoryCache` + `AddSession`, HttpOnly cookie `.strava.stats.session` (SameSite=Lax, Secure=SameAsRequest). `/auth/callback` stores `access_token`, `refresh_token`, `expires_at`, and athlete name in session and redirects to `/welcome` (no tokens sent to client).

- [x] **1.6 Implement Token Refresh Service**
  - _Plan Item:_ Session Management
  - _Req ID:_ [Req 2]
  - **Details:** Create middleware or a service wrapper that checks token expiration before API calls and uses the `refresh_token` to get a new `access_token` if needed.
  - Completed on 2025-11-21: Added `EnsureAccessTokenAsync` helper to auto-refresh when `expires_at` is near/over; updates session with new tokens. Provided `/me` endpoint that uses the helper and returns the Strava athlete JSON.

- [x] **1.7 Create Logout Endpoint**
  - _Plan Item:_ Sign Out Flow
  - _Req ID:_ [Req 2]
  - **Details:** Implement `/auth/logout` to clear session cookies and invalidate server-side session state.
  - Completed on 2025-11-21: Added `GET/POST /auth/logout` which clears server session, deletes the HttpOnly session cookie, and redirects to `/welcome` showing signed-out state.

## Phase 2: Data Ingestion & Core Logic

- [x] **2.1 Define Activity Data Models**
  - _Plan Item:_ Strava API Client
  - _Req ID:_ [Req 3]
  - **Details:** Create DTOs/Classes for Strava Activity (ID, type, distance, moving_time, start_date, timezone, etc.).
  - Completed on 2025-11-22: Added `ActivitySummaryDto` in `src/StravaStats.Api/Models/ActivityDtos.cs` with key fields: `id`, `name`, `type`, `sport_type`, `distance` (m), `moving_time` (s), `elapsed_time` (s), `total_elevation_gain` (m), `start_date` (UTC), `start_date_local`, `timezone`, location arrays, and basic flags/counters. These map Strava's `GET /athlete/activities` summary payload.

- [x] **2.2 Build Strava API Client Wrapper**
  - _Plan Item:_ Strava API Client
  - _Req ID:_ [Req 3]
  - **Details:** Implement a typed HTTP client for fetching activities (`GET /athlete/activities`). Include Authorization header injection.
  - Completed on 2025-11-22: Added `IStravaApiClient` and `StravaApiClient` in `src/StravaStats.Api/Services/StravaApiClient.cs` using named `HttpClient("strava")` (BaseAddress `https://www.strava.com/api/v3/`). Injects `Bearer` token per request and deserializes to `ActivitySummaryDto[]`. Exposed verification endpoint `GET /activities` supporting `page`, `per_page`, `before`, `after`.

- [x] **2.3 Implement Pagination Logic**
  - _Plan Item:_ Pagination & Rate Limiting
  - _Req ID:_ [Req 3]
  - **Details:** Write a loop/recursive function to fetch activities page-by-page until an empty page is returned or a specific date limit is reached.
  - Completed on 2025-11-22 03:02: Added `GetAllActivitiesAsync` to `IStravaApiClient`/`StravaApiClient` that iterates pages (default `perPage=100`) until an empty/short page or `maxPages` reached. Added verification endpoint `GET /activities/all` with query params `per_page`, `before`, `after`, `max_pages`. Uses existing OAuth session and token refresh.

- [x] **2.4 Add Rate Limiting & Backoff**
  - _Plan Item:_ Pagination & Rate Limiting
  - _Req ID:_ [Req 3]
  - **Details:** Inspect Strava response headers (`X-RateLimit-Limit`, `X-RateLimit-Usage`). Implement a delay/pause mechanism if limits are approaching or if `429 Too Many Requests` is received.
  - Completed on 2025-11-22 03:10: In `StravaApiClient`, added header parsing and backoff: on 429, wait until next quarter‑hour window then retry once; during pagination, apply gentle delays when minute usage ≥80% (15s) and ≥90% (60s). No API surface changes; `/activities` and `/activities/all` benefit automatically.

- [x] **2.5 Implement Activity Normalizer**
  - _Plan Item:_ Data Normalization
  - _Req ID:_ [Req 3]
  - **Details:** Convert API timestamps to local datetime objects based on the activity's timezone. Ensure numeric precision for distance (meters) and time (seconds).
  - Completed on 2025-11-22 03:22: Added `ActivityNormalizer` with timezone extraction (IANA), UTC→local conversion with DST support, rounding/precision, and normalized DTO. Added endpoints `GET /activities/normalized` and `GET /activities/all/normalized`.
  - Tests: Added xUnit tests in `tests/StravaStats.Api.Tests` covering (a) Strava timezone string parsing like "(GMT-08:00) America/Los_Angeles"; (b) DST summer conversion for `America/Los_Angeles`; (c) fallback behavior when timezone is missing or malformed; (d) rounding for distance/elevation. Run with `dotnet test`.

- [ ] **2.6 Create In-Memory Cache Service**
  - _Plan Item:_ In-Memory Data Store/Cache
  - _Req ID:_ [Req 3], [Req 11]
  - **Details:** Implement a caching layer (e.g., IMemoryCache or a Dictionary-based singleton scoped to session) to store fetched activities and prevent re-fetching on every page reload.

- [ ] **2.7 Build Unit Conversion Utility**
  - _Plan Item:_ Unit Conversion Service
  - _Req ID:_ [Req 9]
  - **Details:** Create functions to convert Meters -> Miles/Km, Meters/Sec -> Min/Mile or Min/Km pace. Default to imperial units (miles, min/mile) with toggle to switch to metric.

## Phase 3: Dashboard Framework & Basic Widgets

- [x] **3.1 Setup Frontend Project Structure**
  - _Plan Item:_ Dashboard Layout
  - _Req ID:_ N/A
  - **Details:** Scaffold the UI application (HTML/CSS/JS or SPA framework). Configure build pipeline if needed.
  - Completed on 2025-11-22: Static dashboard scaffold under `src/StravaStats.Api/wwwroot/dashboard` with Pico.css and project CSS. Entry `index.html` served at `/dashboard/` loading `app.js`. Basic features:
    - Auth status with links to `/auth/login` and `/auth/logout`
    - Recent Activities table (first page via `/activities/normalized`)
    - Last 30 days totals (via `/activities/all/normalized`)
    - Graceful empty/unauthorized states
    - File structure created: `css/site.css`, and initial JS module placeholders in `js/` for future state/UI refactors.

- [x] **3.2 Implement Main Dashboard Grid**
  - _Plan Item:_ Dashboard Layout
  - _Req ID:_ N/A
  - **Details:** Create the responsive container and grid layout for widgets.
  - Completed on 2025-11-22: Added `.dashboard-grid` single-column responsive layout with proper card styling (background, border, padding). Fixed stat card text wrapping with `white-space: nowrap` on headers and proper spacing. Cards now display cleanly without text breaking awkwardly.

- [x] **3.2.5 Implement Dashboard Summary and Navigation**
  - _Plan Item:_ Dashboard Summary
  - _Req ID:_ [Req 4]
  - **Details:** Make "Strava Stats" branding in the header clickable to navigate back to the dashboard home page. Add dashboard-wide summary section above tabs showing Date Range (start to end dates), Total Activities, and Total Moving Time. Reorder tabs to: Overview, Duration, Heatmap, Trends, Running Stats.
  - Completed on 2025-11-22: Converted "Strava Stats" branding from `<span>` to `<a>` link pointing to `/dashboard/`. Added `text-decoration: none` to maintain visual appearance while enabling clickable navigation to dashboard home.
  - Updated on 2025-11-22: Added dashboard summary section above tabs with three stat cards (Date Range, Total Activities, Total Moving Time). Moved stats from Overview tab to dashboard summary so they're visible across all tabs. Updated Overview tab to show only Activity Count Distribution chart. Swapped tab order: Trends now appears before Running Stats. Updated JavaScript to use new `summary*` element IDs and `summaryDateRange` for formatted date ranges showing actual start and end dates instead of preset names.

- [x] **3.3 Create State Management Store**
  - _Plan Item:_ Global State Management
  - _Req ID:_ [Req 9], [Req 10]
  - **Details:** Set up a store (Context API, Redux, Pinia, or simple state) to hold `allActivities`, `filteredActivities`, `dateRange`, and `unitSystem`.
  - Completed on 2025-11-22: Enhanced `js/state.js` with subscriber pattern and centralized state management. Store holds `user`, `allActivities`, `filteredActivities`, `dateRange` (with type and custom dates), and `unitSystem` (imperial/metric). Includes `subscribe()`, `getState()`, `setUser()`, `setAllActivities()`, `setDateRange()`, `setUnitSystem()`, and `initializeUnitSystem()` functions. Automatic filtering logic applies date ranges (last30/ytd/all/custom). Refactored `app.js` to use the store with reactive re-rendering on state changes.

- [x] **3.4 Build Date Range Picker Component**
  - _Plan Item:_ Date Filter Controls
  - _Req ID:_ [Req 9]
  - **Details:** Create UI for date range presets (Last 7 Days, Last 30 Days, YTD, All Time) and Custom Start/End inputs. Wire up logic to filter the `allActivities` list into `filteredActivities`. Default to "Last 7 Days" on initial load.
  - Completed on 2025-11-22: Added date range picker UI in `index.html` with buttons for Last 7 Days, Last 30 Days, Last 90 Days, Last 6 Months, Year to Date, All Time, and Custom Range with custom date inputs. Styled in `site.css` with flexbox layout. Implemented event handlers in `app.js` that call `setDateRange()` from state store. Custom date inputs show/hide based on selection. Totals title updates dynamically to reflect current date range. Filtering logic in `state.js` automatically applies to `filteredActivities` and triggers re-render via subscriber pattern. Defaults to "Last 7 Days" on initial load.

- [x] **3.4.5 Implement Tabbed Dashboard Layout (Foundation)**
  - _Plan Item:_ Dashboard Layout Enhancement
  - _Req ID:_ [Req 8], [Req 8], [Req 8], [Req 8]
  - **Details:** Convert dashboard from grid layout to tabbed interface. Create tab infrastructure with initial "Overview" tab (containing current Totals and Recent Activities sections). Implement tab switching logic, state management for active tab, and styling with active state. Ensure tabs are responsive on mobile. The date range filter should remain global and apply to all tabs.
  - Completed on 2025-11-22: Created tabbed interface foundation with "Overview" tab containing existing Totals and Recent Activities. Added tab navigation bar in `index.html` with emoji icon. Styled tabs in `site.css` with active state (bottom border highlight), hover effects, and mobile-responsive horizontal scroll. Added `activeTab` to state.js with `setActiveTab()` function. Implemented tab switching logic in `app.js` that updates button states and panel visibility via subscriber pattern. Date range filter remains global and applies to all tabs.

- [x] **3.5 Implement Overview and Distribution Charts**
  - _Plan Item:_ Overview Tab and Distribution Charts
  - _Req ID:_ [Req 8]
  - **Details:** Integrate a chart library (e.g., Chart.js, Recharts). Create Overview tab with totals summary and Activity Count pie chart. Create separate Time Distribution tab. Display data labels on chart slices for segments representing more than 5% of the total.
  - Completed on 2025-11-22: Integrated Chart.js (v4.4.0) and chartjs-plugin-datalabels (v2.2.0) via CDN. Implemented donut charts that group activities by `sport_type`:
    - **Overview Tab**: Shows totals summary (Total Activities, Total Moving Time) and Activity Count Distribution chart with count values displayed directly on slices > 5%
    - **Time Distribution Tab**: Shows total time per type with HH:MM format (e.g., "12h 34m") and percentage in tooltips, plus time values displayed directly on slices > 5%
    - Both charts use color-coded legends positioned on the right, are responsive (400px mobile, 500px desktop), and automatically update when date range filter changes via subscriber pattern
    - Added `generateColors()` helper with 10 distinct colors for consistent styling
    - Data labels use white bold text (14px) and only show for segments > 5% to avoid clutter on small slices
  - Updated on 2025-11-22: Consolidated Activity Count tab into Overview tab, removed Recent Activities table, simplified totals to show only Total Activities and Total Moving Time.

- [x] **3.6 Implement Running Stats Tab**
  - _Plan Item:_ Running Statistics Component & Distance Histogram
  - _Req ID:_ [Req 8]
  - **Details:** Add "Running Stats" tab to dashboard combining distance histogram and key statistics. Display summary statistics first, followed by the histogram for better information hierarchy.

  - [x] **3.6a Implement Distance Histogram**
    - **Details:** Create logic to bin runs by distance (0-1mi, 1-2mi, 2-3mi, etc.). Render a bar chart using these bins. Filter activities to only include running types (Run, TrailRun, VirtualRun).
    - Completed on 2025-11-22: Added "🏃 Running Stats" tab with distance histogram bar chart. Filters activities to running types only (Run, TrailRun, VirtualRun). Bins distances dynamically based on unit system: 1-mile bins for imperial, 2-km bins for metric. Chart displays number of runs in each distance range with rotated labels (45°) for readability. Automatically updates when date range or unit system changes via subscriber pattern.

  - [x] **3.6b Implement Running Statistics Summary**
    - **Details:** Create component to compute and display: Total Runs, 10K+ Runs, Total Distance, Avg Pace. Calculate PRs (Fastest 10k, Longest Run) from the filtered list of running activities.
    - Completed on 2025-11-22: Added Running Summary section with six statistics cards: Total Runs (count of running activities), 10K+ Runs (runs >= 10km), Total Distance (sum with unit conversion), Avg Pace (formatted as MM:SS min/mi or min/km), Fastest 10K (best time for runs >= 10km), and Longest Run (maximum distance). Implemented `renderRunningStats()` function that filters to running types, calculates all metrics with proper unit system support, handles empty states, and integrates with subscriber pattern for reactive updates.
    - Updated on 2025-11-22: Reordered Running Stats tab to display summary statistics first, followed by the distance histogram for better information hierarchy and user experience.

## Phase 4: Advanced Visualization & Trends

- [x] **4.1 Implement Heatmap Data Transformation**
  - _Plan Item:_ Heatmap Component Logic
  - _Req ID:_ [Req 8]
  - **Details:** Write a function to transform a list of activities into a map of `{ "YYYY-MM-DD": value }` for both "All Activities" (intensity by total time per day) and "Running Only" (intensity by distance) modes.
  - Completed on 2025-11-22: Added `transformToHeatmapData(activities, mode)` function in app.js. Function accepts activities array and mode ('all' or 'running') and returns a map where each date key (YYYY-MM-DD) contains aggregated metrics: count (number of activities), time (total moving time in seconds), and distance (total distance in meters). Supports filtering to running types (Run, TrailRun, VirtualRun) when mode is 'running'. Extracts dates from start_local timestamps for proper timezone handling.

- [x] **4.2 Build Calendar Heatmap Component**
  - _Plan Item:_ Heatmap Tab with Mode Toggle
  - _Req ID:_ [Req 8]
  - **Details:** Render a GitHub-style calendar grid. Add single "🔥 Heatmap" tab to dashboard with mode toggle/buttons to switch between "All Activities" and "Running Only" views. Display legend showing intensity scale (Less to More) within the Heatmap tab. Calculate and display "Current Streak" and "Longest Streak" metrics based on consecutive days in the filtered dataset. For "All Activities" mode, intensity is measured by total time spent per day.
  - Completed on 2025-11-22: Added "🔥 Heatmap" tab with segmented toggle for modes (All Activities vs Running Only). Implemented calendar heatmap grid (weeks as columns, days as rows) with 5-level color scale based on activity density (All = time/day, Running = distance/day). Integrated with global date range filter and reactive store; rerenders on filter, tab, or mode changes. Added streak metrics section computing Current and Longest streaks across the selected range. Accessible tooltips and ARIA labels included. Styled legend and cells in site.css. Legend is displayed within the Heatmap tab showing intensity scale from Less to More.

- [x] **4.2.1 Add Gap Details Feature**
  - _Plan Item:_ Heatmap Gap Analysis
  - _Req ID:_ [Req 8]
  - **Details:** Add "Show Gap Details" button to Heatmap tab. When clicked, display a list of all gap periods (consecutive days without activity) in the selected date range, showing the start date, end date, and duration (in days) of each gap. Implement logic to identify gaps from the day values array used in heatmap rendering.
  - Completed on 2025-11-22: Added "Show Gap Details" button below streaks section. Implemented `calculateGaps()` function that identifies consecutive days without activity. Button toggles visibility of gap list and changes text between "Show Gap Details" and "Hide Gap Details". Gap periods displayed as cards showing date range and duration. Displays friendly message when no gaps found.

- [x] **4.2.2 Add Workout Statistics**
  - _Plan Item:_ Heatmap Workout Statistics
  - _Req ID:_ [Req 8]
  - **Details:** Add comprehensive workout statistics display to Heatmap tab showing: Workout Days (total days with activity), Missed Days (days without activity), Current Streak (consecutive active days ending today), Days Since Last (days since most recent activity), Longest Gap (longest period without activity), and Total Gap Days (sum of all gap days). Display these as a grid of stat cards similar to the overview layout.
  - Completed on 2025-11-22: Replaced "Streaks" section with "Workout Statistics" section containing 6 stat cards in a responsive grid. Added CSS for `.workout-stats-grid` and `.workout-stat` styles. Implemented calculation logic in `renderHeatmap()` for all 6 statistics. Statistics update dynamically when date range or heatmap mode changes.

- [x] **4.2.3 Update Heatmap Legend with Time-based Labels**
  - _Plan Item:_ Heatmap Legend Enhancement
  - _Req ID:_ [Req 8]
  - **Details:** Replace generic "Less/More" legend labels with descriptive time-based labels for All Activities mode ("No Activity", "< 1h", "1-2h", "2h+") and distance-based labels for Running Only mode. Update quantization logic to use fixed time/distance thresholds instead of relative percentages.
  - Completed on 2025-11-22: Replaced generic "Less/More" legend with descriptive time-based labels. Restructured legend HTML with 4 levels (reduced from 5) using `.legend-item` containers. Implemented `updateLegendLabels()` function to dynamically update labels based on mode (All Activities: "No Activity", "< 1h", "1-2h", "2h+" | Running: "No Activity", "< 5km", "10-15km", "15km+"). Updated `quantizeLevel()` to use fixed thresholds instead of relative percentages. Updated CSS with `.legend-item`, `.legend-label` styles and reduced color levels to 4.

- [x] **4.2.4 Implement Horizontal Heatmap Layout**
  - _Plan Item:_ Heatmap Layout Enhancement
  - _Req ID:_ [Req 8]
  - **Details:** Change heatmap layout from vertical (weeks as columns, days as rows) to horizontal (days as rows, weeks as columns) to better utilize available screen width. Update rendering logic to build rows for each day of the week (Sunday through Saturday) with week columns flowing horizontally. Add day-of-week labels on the left side. Update CSS to support horizontal scrolling and responsive layout.
  - Completed on 2025-11-22: Changed heatmap from vertical to horizontal layout. Implemented 7 rows (one per day of week: Sun-Sat) with weeks flowing horizontally as columns. Added day-of-week labels on the left side (32px wide, right-aligned). Updated `renderHeatmap()` to group days by day of week and render as `.heatmap-row` elements. Updated CSS: changed `.heatmap` to column flex direction, added `.heatmap-row` and `.day-label` styles, increased day cell size from 12px to 14px, reduced gaps to 3px, added `flex-shrink: 0` to prevent squishing. Layout now better utilizes available screen width with horizontal scrolling support.

- [x] **4.3 Build Trends Tab**
  - _Plan Item:_ Trends Tab with Mode Toggle
  - _Req ID:_ [Req 8]
  - **Details:** Add single "📈 Trends" tab to dashboard displaying line charts for distance and pace over time with aggregation options and smoothing. Trends are running-specific only since pace data is only relevant for running activities.
  - Completed on 2025-11-22: Implemented complete trends functionality with aggregation logic (4.3.1) and visualization (4.3.2). Updated on 2025-11-22: Removed mode toggle since trends are running-specific only.

  - [x] **4.3.1 Implement Trend Aggregation Logic**
    - **Details:** Create function to group filtered data by Day, Week, or Month for both "All Activities" and "Running Only" modes. Calculate distance totals and average pace for each time bucket. Implement moving average smoothing (e.g., 7-day rolling avg) to reduce noise in daily data.
    - Completed on 2025-11-22: Added trend aggregation utilities in `app.js`:
      - `groupActivitiesForTrends(activities, { mode, granularity })` buckets by Day/ISO Week/Month and returns sorted buckets with `distance_m_total`, `moving_time_s_total`, `count`, and `avg_pace_s_per_km` (pace computed from running activities only). Supports `mode: 'all' | 'running'`.
      - `movingAverage(series, field, window)` computes trailing moving average for any numeric field (default 7). Exposed via `window.Trends` for use by charts in 4.3.2.

  - [x] **4.3.2 Build Trend Line Charts**
    - **Details:** Render line charts for distance and pace over time using Chart.js. Implement aggregation selector (Day/Week/Month/Year) with segmented control. Display separate charts for distance and pace trends. Trends are running-specific only since pace data is only relevant for running activities.
    - Completed on 2025-11-22: Added "📈 Trends" tab with granularity selector (Daily/Weekly/Monthly/Yearly). Implemented two separate line charts:
      - **Distance Over Time**: Shows running distance trends in user's preferred units (mi/km) with orange styling. Applies 7-day moving average smoothing for daily granularity to reduce noise.
      - **Pace Over Time**: Shows average running pace trends (min/mi or min/km) with blue styling and inverted y-axis (faster pace at top). Only displays when running data is available. Applies 7-day moving average smoothing for daily data.
      - Both charts are responsive, integrate with global date range filter and unit system, and automatically re-render when granularity, date range, or unit system changes. Charts use existing `groupActivitiesForTrends()` and `movingAverage()` functions from task 4.3.1.
    - Updated on 2025-11-22: Removed mode toggle since trends are running-specific only. Simplified to show only granularity selector and "Running Trends" title.

## Phase 5: User Experience & Quality Assurance

- [x] **5.1 Add Loading Skeletons/Spinners**
  - _Plan Item:_ Performance Optimization
  - _Req ID:_ [Req 12]
  - **Details:** Show visual feedback while data is being fetched or re-calculated.
  - Completed on 2025-11-22: Added loading spinner animations to all chart components (Activity Count, Time Distribution, Distance Histogram, Distance Trend, Pace Trend). Created CSS styles for `.loading`, `.spinner` with rotation animation, and `.loading-text`. Each chart rendering function now shows a loading spinner before rendering and hides it after the chart is displayed. Initial data fetch already shows "Loading activities..." message in totals section.

- [x] **5.2 Handle "No Data" States**
  - _Plan Item:_ Empty States
  - _Req ID:_ [Req 10]
  - **Details:** Ensure widgets display a friendly message if the date filter results in zero activities.
  - Completed on 2025-11-22: Added empty state handling to all charts and tabs:
    - **Overview Tab**: Shows "No activities in the selected date range" when activity count chart has no data
    - **Duration Tab**: Shows "No activities in the selected date range" when time distribution chart has no data
    - **Trends Tab**: Shows "No running activities in the selected date range" for both distance and pace charts when no running data exists
    - **Running Stats Tab**: Shows "No running activities in the selected date range" for both running summary cards and distance histogram when no running data exists
    - **Dashboard Summary**: Already had empty state handling with dynamic messages based on date range type
    - Added CSS styling for consistent empty state appearance (padding, centering, muted color)
    - All chart functions now check for empty data, destroy existing charts, hide loading spinner, and show empty message before attempting to render

- [ ] **5.3 Implement Global Error Boundary/Toast**
  - _Plan Item:_ Error Handling UI
  - _Req ID:_ [Req 10]
  - **Details:** Catch API errors (401, 500) and display a user-friendly notification or error page.

- [ ] **5.4 Persist User Preferences**
  - _Plan Item:_ Persist User Settings
  - _Req ID:_ [Req 8], [Req 9]
  - **Details:** Save the selected Unit System and Date Range to `localStorage` or URL query parameters so they persist on reload.

- [ ] **5.5 Conduct Security Audit**
  - _Plan Item:_ Security Review
  - _Req ID:_ [Req 1], [Req 2]
  - **Details:** Verify no secrets are committed. Test that logging out invalidates the token. Verify tokens are not accessible via client-side JS (if using HttpOnly cookies).
