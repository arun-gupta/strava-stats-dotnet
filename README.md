# Strava Activity Analyzer (DotNet)

![Built with JetBrains Rider](https://img.shields.io/badge/Built%20with-JetBrains%20Rider-000000?logo=rider&logoColor=white)
![Co-authored by Junie & Claude Agent](https://img.shields.io/badge/Co%E2%80%91authored%20by-Junie%20%26%20Claude%20Agent-6B46C1)

An ASP.NET Core 8 Web API for analyzing Strava activities with an interactive dashboard for tracking your fitness progress.

## Features

Current highlights:
- **Secure Authentication**: OAuth login with Strava, secure server-side session (no tokens exposed to browser), automatic token refresh
- **Smart Data Fetching**: Typed Strava API client with pagination and respectful rate-limit backoff
- **Activity Normalization**: DST-aware local time conversion, consistent unit handling
- **Interactive Dashboard** at `/dashboard`:
  - **Overview Tab**: Activity summaries with totals, distance, moving time, averages, and recent activities table
  - **Activity Count Tab**: Donut chart showing distribution of activities by sport type with data labels
  - **Time Distribution Tab**: Donut chart showing total time per sport type (HH:MM format) with data labels
  - **Running Stats Tab**:
    - Distance histogram with dynamic binning (1-mile or 2-km bins based on unit system)
    - Running summary cards: Total Runs, 10K+ Runs, Total Distance, Avg Pace, Fastest 10K, Longest Run
  - Flexible date range filtering (Last 7/30/90 days, 6 months, YTD, All Time, Custom)
  - Imperial/Metric unit system support with automatic conversion
  - Responsive design for mobile and desktop
  - Real-time reactive updates when filters or units change

![Dashboard](docs/images/dashboard.png)

## Quickstart

One-minute setup on macOS with Homebrew (recommended). For other platforms and details, see Advanced Setup below.

1) Install .NET 8 SDK (LTS)
```bash
brew update
brew install --cask dotnet-sdk@8
```

2) Configure secrets for local dev
```bash
cp .env.example .env
# edit .env and set
# STRAVA_CLIENT_ID=...
# STRAVA_CLIENT_SECRET=...
# SESSION_SECRET=...
```

3) Start the API
```bash
./quickstart.sh        # first time you may need: chmod +x quickstart.sh
```

After signing in with Strava, you'll be redirected to your dashboard.

### Advanced setup and alternatives
- Windows/Linux install instructions, PATH notes, and using dotnet user-secrets are documented here:
  - [docs/setup.md](docs/setup.md)

## Roadmap
See [docs/specs/tasks.md](docs/specs/tasks.md) and [docs/specs/plan.md](docs/specs/plan.md).

## Contributing
Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, Git hooks configuration, and contribution guidelines.

