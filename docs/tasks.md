# Technical Task List

This document tracks the step-by-step technical tasks required to build the Strava Activity Analyzer. Each task is linked to the high-level plan and specific requirements.

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

- [ ] **2.1 Define Activity Data Models**
  - _Plan Item:_ Strava API Client
  - _Req ID:_ [Req 3]
  - **Details:** Create DTOs/Classes for Strava Activity (ID, type, distance, moving_time, start_date, timezone, etc.).

- [ ] **2.2 Build Strava API Client Wrapper**
  - _Plan Item:_ Strava API Client
  - _Req ID:_ [Req 3]
  - **Details:** Implement a typed HTTP client for fetching activities (`GET /athlete/activities`). Include Authorization header injection.

- [ ] **2.3 Implement Pagination Logic**
  - _Plan Item:_ Pagination & Rate Limiting
  - _Req ID:_ [Req 3]
  - **Details:** Write a loop/recursive function to fetch activities page-by-page until an empty page is returned or a specific date limit is reached.

- [ ] **2.4 Add Rate Limiting & Backoff**
  - _Plan Item:_ Pagination & Rate Limiting
  - _Req ID:_ [Req 3]
  - **Details:** Inspect Strava response headers (`X-RateLimit-Limit`, `X-RateLimit-Usage`). Implement a delay/pause mechanism if limits are approaching or if `429 Too Many Requests` is received.

- [ ] **2.5 Implement Activity Normalizer**
  - _Plan Item:_ Data Normalization
  - _Req ID:_ [Req 3]
  - **Details:** Convert API timestamps to local datetime objects based on the activity's timezone. Ensure numeric precision for distance (meters) and time (seconds).

- [ ] **2.6 Create In-Memory Cache Service**
  - _Plan Item:_ In-Memory Data Store/Cache
  - _Req ID:_ [Req 3], [Req 11]
  - **Details:** Implement a caching layer (e.g., IMemoryCache or a Dictionary-based singleton scoped to session) to store fetched activities and prevent re-fetching on every page reload.

- [ ] **2.7 Build Unit Conversion Utility**
  - _Plan Item:_ Unit Conversion Service
  - _Req ID:_ [Req 9]
  - **Details:** Create functions to convert Meters -> Miles/Km, Meters/Sec -> Min/Mile or Min/Km pace.

## Phase 3: Dashboard Framework & Basic Widgets

- [ ] **3.1 Setup Frontend Project Structure**
  - _Plan Item:_ Dashboard Layout
  - _Req ID:_ N/A
  - **Details:** Scaffold the UI application (HTML/CSS/JS or SPA framework). Configure build pipeline if needed.

- [ ] **3.2 Implement Main Dashboard Grid**
  - _Plan Item:_ Dashboard Layout
  - _Req ID:_ N/A
  - **Details:** Create the responsive container and grid layout for widgets.

- [ ] **3.3 Create State Management Store**
  - _Plan Item:_ Global State Management
  - _Req ID:_ [Req 8], [Req 9]
  - **Details:** Set up a store (Context API, Redux, Pinia, or simple state) to hold `allActivities`, `filteredActivities`, `dateRange`, and `unitSystem`.

- [ ] **3.4 Build Date Range Picker Component**
  - _Plan Item:_ Date Filter Controls
  - _Req ID:_ [Req 8]
  - **Details:** Create UI for "Last 30 Days", "YTD", "All Time", and Custom Start/End inputs. Wire up logic to filter the `allActivities` list into `filteredActivities`.

- [ ] **3.5 Implement Running Stats Widget**
  - _Plan Item:_ Running Statistics Component
  - _Req ID:_ [Req 6]
  - **Details:** Create component to compute and display: Total Runs, 10K+ Runs, Total Distance, Avg Pace. Calculate PRs (Fastest 10k, Longest Run) from the filtered list.

- [ ] **3.6 Implement Activity Distribution Charts**
  - _Plan Item:_ Activity Distribution Charts
  - _Req ID:_ [Req 4]
  - **Details:** Integrate a chart library (e.g., Chart.js, Recharts). Create Pie/Donut charts for "Count by Type" and "Time by Type".

- [ ] **3.7 Implement Distance Histogram**
  - _Plan Item:_ Distance Histogram
  - _Req ID:_ [Req 6]
  - **Details:** Create logic to bin runs by distance (0-1mi, 1-2mi, etc.). Render a bar chart using these bins.

## Phase 4: Advanced Visualization & Trends

- [ ] **4.1 Implement Heatmap Data Transformation**
  - _Plan Item:_ Heatmap Component Logic
  - _Req ID:_ [Req 5]
  - **Details:** Write a function to transform a list of activities into a map of `{ "YYYY-MM-DD": value }`.

- [ ] **4.2 Build Calendar Heatmap Component**
  - _Plan Item:_ Workout & Running Heatmaps
  - _Req ID:_ [Req 5]
  - **Details:** Render a GitHub-style calendar grid. Support two modes: "All Activities" (intensity = frequency) and "Running" (intensity = distance).

- [ ] **4.3 Calculate Streak Metrics**
  - _Plan Item:_ Workout & Running Heatmaps
  - _Req ID:_ [Req 5]
  - **Details:** Implement algorithm to find "Current Streak" and "Longest Streak" based on consecutive days in the filtered dataset.

- [ ] **4.4 Implement Trend Aggregation Logic**
  - _Plan Item:_ Trend Calculation Engine
  - _Req ID:_ [Req 7]
  - **Details:** Create service to group filtered data by Day, Week, or Month.

- [ ] **4.5 Build Trend Line Charts**
  - _Plan Item:_ Mileage & Pace Trend Charts
  - _Req ID:_ [Req 7]
  - **Details:** Render line charts for "Mileage over time" and "Avg Pace over time". Implement moving average smoothing (e.g., 7-day rolling avg).

## Phase 5: User Experience & Quality Assurance

- [ ] **5.1 Add Loading Skeletons/Spinners**
  - _Plan Item:_ Performance Optimization
  - _Req ID:_ [Req 11]
  - **Details:** Show visual feedback while data is being fetched or re-calculated.

- [ ] **5.2 Handle "No Data" States**
  - _Plan Item:_ Empty States
  - _Req ID:_ [Req 10]
  - **Details:** Ensure widgets display a friendly message if the date filter results in zero activities.

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
