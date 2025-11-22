# Strava Activity Analyzer (DotNet)

![Built with JetBrains Rider](https://img.shields.io/badge/Built%20with-JetBrains%20Rider-000000?logo=rider&logoColor=white)
![Co‑authored by Junie](https://img.shields.io/badge/Co%E2%80%91authored%20by-Junie-4C9BF0)

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

3) Start the API (opens Strava auth by default)
```bash
./start.sh        # first time you may need: chmod +x start.sh
```

After signing in with Strava, you’ll be redirected to your dashboard:

![Dashboard](docs/images/dashboard.png)

### About the start.sh helper
On macOS/Linux (or Git Bash on Windows), `start.sh` will:
- Load variables from `.env` if present.
- Default `ASPNETCORE_ENVIRONMENT=Development` if not set.
- Run `dotnet restore`, `dotnet build`, and start the API.

Note: If you see a message about a missing framework like "Microsoft.NETCore.App 8.0.0", ensure the .NET 8 runtime is installed as shown above.

### Advanced setup and alternatives
- Windows/Linux install instructions, PATH notes, and using dotnet user-secrets are documented here:
  - docs/setup.md

## Configuration (secrets)

Keep the README simple: use one of the following, and see docs for full instructions.

- Quick local setup: copy `.env.example` to `.env`, fill in your Strava app creds and a session secret, then run `./start.sh` (it auto-loads `.env`).
- Alternative methods (dotnet user-secrets, environment variables for CI/containers), supported keys, and security notes are documented in `docs/setup.md`.

## Repo structure

```
src/
  StravaStats.Api/
    Options/
      StravaOptions.cs
      SecurityOptions.cs
    Program.cs
    appsettings.json
    Properties/launchSettings.json
docs/
start.sh
```

## Roadmap
See `docs/specs/tasks.md` and `docs/specs/plan.md`.


### Git hooks (auto add Co‑authored‑by: Junie)
This repository is configured to append a co‑author trailer to every commit message via a local Git hook.

Setup (one time per clone):
```bash
git config core.hooksPath .githooks
chmod +x .githooks/prepare-commit-msg
```

After this, your commits will automatically include:
```
Co-authored-by: Junie <junie@jetbrains.com>
```
The hook skips merge commits and won’t duplicate the trailer if it already exists.

