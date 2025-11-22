# Strava Activity Analyzer (DotNet)

![Built with JetBrains Rider](https://img.shields.io/badge/Built%20with-JetBrains%20Rider-000000?logo=rider&logoColor=white)
![Co-authored by Junie & Claude Agent](https://img.shields.io/badge/Co%E2%80%91authored%20by-Junie%20%26%20Claude%20Agent-6B46C1)

An ASP.NET Core 8 Web API for analyzing Strava activities. This repo will later include a frontend dashboard, but Phase 1 focuses on backend auth and data ingestion.

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
./start.sh        # first time you may need: chmod +x start.sh
```

After signing in with Strava, you’ll be redirected to your dashboard:

![Dashboard](docs/images/dashboard.png)


### Advanced setup and alternatives
- Windows/Linux install instructions, PATH notes, and using dotnet user-secrets are documented here:
  - [docs/setup.md](docs/setup.md)

<!-- Configuration (secrets) section removed for a leaner README. See docs/setup.md#configure-secrets for full details. -->

## Features

Current highlights:
- OAuth login with Strava and secure server-side session (no tokens exposed to the browser)
- Automatic token refresh and a clean Logout flow
- Typed Strava API client with pagination and respectful rate‑limit backoff
- Activity normalization (DST‑aware local time, consistent units)
- Minimal dashboard at `/dashboard`:
  - Login status with Sign in/Logout
  - Recent Activities table (first page)
  - Last 30 days totals (count, distance, time)
  - Graceful empty/unauthorized states

## Roadmap
See [docs/specs/tasks.md](docs/specs/tasks.md) and [docs/specs/plan.md](docs/specs/plan.md).

## Contributing
Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, Git hooks configuration, and contribution guidelines.

