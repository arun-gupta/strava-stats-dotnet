### Advanced Setup and Alternatives

This repository targets .NET 8 (LTS). Below are optional/alternative ways to install tooling, configure secrets, and run the API beyond the one‑minute Quickstart in README.

#### Install .NET 8 SDK
- macOS (Homebrew):
  ```bash
  brew update
  brew install --cask dotnet-sdk@8
  dotnet --list-sdks | grep 8.
  ```
- Windows (winget):
  ```powershell
  winget install --id Microsoft.DotNet.SDK.8 --source winget
  dotnet --list-sdks
  ```
- Linux (Ubuntu/Debian):
  ```bash
  sudo apt-get update
  sudo apt-get install -y dotnet-sdk-8.0
  ```
  For other distros or if packages aren’t found, use Microsoft’s official instructions.

PATH notes (macOS)
- If `dotnet` isn’t found after install, ensure PATH includes one of:
  - `/opt/homebrew/share/dotnet` (Apple Silicon)
  - `/usr/local/share/dotnet` (Intel)
  ```bash
  echo 'export PATH="$PATH:/opt/homebrew/share/dotnet:/usr/local/share/dotnet"' >> ~/.zshrc
  source ~/.zshrc
  ```

#### Configure secrets
- Local `.env` (recommended for quick dev):
  ```bash
  cp .env.example .env
  # edit .env and set
  # STRAVA_CLIENT_ID=...
  # STRAVA_CLIENT_SECRET=...
  # SESSION_SECRET=...
  ```
- dotnet User Secrets (keeps secrets outside the repo):
  ```bash
  dotnet user-secrets init --project src/StravaStats.Api
  dotnet user-secrets set "Strava:ClientId" "<client_id>" --project src/StravaStats.Api
  dotnet user-secrets set "Strava:ClientSecret" "<client_secret>" --project src/StravaStats.Api
  dotnet user-secrets set "Security:SessionSecret" "<random-hex>" --project src/StravaStats.Api
  ```
  At startup, the app also maps flat env vars (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SESSION_SECRET`) to the nested config keys.

#### Run the API

##### Helper script: start.sh
The helper script provides a smooth local dev experience:
- Loads variables from `.env` if present (without echoing secrets).
- Defaults `ASPNETCORE_ENVIRONMENT=Development` if not set.
- Runs `dotnet restore` and `dotnet build` before launching.
- Starts the API, waits for `/health`, and opens a browser.
- Cleans up any previous background process and frees ports 5185/7185 when needed.

Usage:
```bash
./start.sh                    # first time: chmod +x start.sh
# Choose the page to open automatically (default: dashboard)
./start.sh --open=dashboard   # open the dashboard (default)
./start.sh --open=auth        # jump to Strava sign-in
./start.sh --open=swagger     # open Swagger UI
```

- Manual commands:
  ```bash
  dotnet restore
  dotnet build
  dotnet run --project src/StravaStats.Api
  ```

Default dev URLs
- HTTP:  http://localhost:5185
- HTTPS: https://localhost:7185

Trust the dev certificate (optional for HTTPS warnings)
```bash
dotnet dev-certs https --trust
```

#### Troubleshooting
- Missing framework “Microsoft.NETCore.App 8.x”: ensure .NET 8 SDK/Runtime is installed (see above). A `global.json` pins SDK 8.x in this repo. If the app fails to start, re-run install steps and verify with `dotnet --info`.
- Port already in use (5185/7185): use the updated `start.sh` which cleans up previous instances and frees ports; or run `lsof -i :7185` and `kill <pid>` on macOS.
- `dotnet: command not found`: verify PATH or re‑open your shell after install.
