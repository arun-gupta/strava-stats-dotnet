# Strava Activity Analyzer (DotNet)

An ASP.NET Core 8 Web API for analyzing Strava activities. This repo will later include a frontend dashboard, but Phase 1 focuses on backend auth and data ingestion.

## Quickstart

This project requires the .NET 8 SDK (LTS).

### 1) Install .NET 8 SDK (macOS)
- Using Homebrew (recommended):
  ```bash
  brew update
  brew install --cask dotnet-sdk@8
  # verify runtime/SDK versions
  dotnet --list-runtimes | grep Microsoft.NETCore.App | grep 8.
  dotnet --list-sdks | grep 8.
  ```
- Or download the official .NET 8 installer (PKG) for your architecture (Apple Silicon = Arm64, Intel = x64):
  https://dotnet.microsoft.com/en-us/download/dotnet/8.0

If `dotnet` isn’t found after install, ensure it’s on your PATH. Common locations:
`/opt/homebrew/share/dotnet` (Apple Silicon), `/usr/local/share/dotnet` (Intel). You can add both:
```bash
echo 'export PATH="$PATH:/opt/homebrew/share/dotnet:/usr/local/share/dotnet"' >> ~/.zshrc
source ~/.zshrc
```

### 2) Start the API
- Single-command start (recommended):
  ```bash
  ./start.sh        # first time you may need: chmod +x start.sh
  ```
- Or run manually:
  ```bash
  dotnet restore
  dotnet build
  dotnet run --project src/StravaStats.Api
  ```

Then open:
- Swagger UI (Development): https://localhost:7185/swagger
- Health check: `GET http://localhost:5185/health` → `{ "status": "ok" }`

### About the start.sh helper
On macOS/Linux (or Git Bash on Windows), `start.sh` will:
- Load variables from `.env` if present.
- Default `ASPNETCORE_ENVIRONMENT=Development` if not set.
- Run `dotnet restore`, `dotnet build`, and start the API.

Note: If you see a message about a missing framework like "Microsoft.NETCore.App 8.0.0", ensure the .NET 8 runtime is installed as shown above.

## Secrets & configuration (Task 1.2)

Never commit secrets. This repo ignores `.env` and common secret files.

Supported configuration keys:
- `Strava:ClientId` / `Strava:ClientSecret` — Strava OAuth application credentials
- `Security:SessionSecret` — secret for session/cookie/HMAC usage

You can provide them using either nested keys or flat env vars:
- Nested (ASP.NET style): `Strava__ClientId`, `Strava__ClientSecret`, `Security__SessionSecret`
- Flat (legacy/simple): `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SESSION_SECRET`

Both styles are supported. At startup we map the flat variables into the nested section so options binding works consistently.

### Option A: .env (local only)
1. Copy the example file and fill real values:
   ```bash
   cp .env.example .env
   # edit .env and set values
   ```
2. Run the API as usual. Your shell will need to export the variables from `.env` (e.g., using `direnv`, `dotenvx`, or `export $(grep -v '^#' .env | xargs)`), or configure your IDE run profile to load them.

### Option B: dotnet user-secrets (recommended for local dev)
User Secrets stores values outside the repo, per machine.

```bash
dotnet user-secrets init --project src/StravaStats.Api
dotnet user-secrets set "Strava:ClientId" "<your_client_id>" --project src/StravaStats.Api
dotnet user-secrets set "Strava:ClientSecret" "<your_client_secret>" --project src/StravaStats.Api
dotnet user-secrets set "Security:SessionSecret" "<a-long-random-string>" --project src/StravaStats.Api
```

### Option C: Environment variables (CI/container/prod)
Set either nested or flat variables in your deployment environment. Examples (Bash):

```bash
export Strava__ClientId=123
export Strava__ClientSecret=abc
export Security__SessionSecret=$(openssl rand -hex 32)
```
or
```bash
export STRAVA_CLIENT_ID=123
export STRAVA_CLIENT_SECRET=abc
export SESSION_SECRET=$(openssl rand -hex 32)
```

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
See `docs/tasks.md` and `docs/plan.md`.

