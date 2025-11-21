#!/usr/bin/env bash
# Simple launcher for the StravaStats API
# - Loads .env if present
# - Sets a sensible default environment
# - Restores, builds, and runs the API project
# - Optional: opens a browser page after start (--open=swagger|auth)

set -euo pipefail

OPEN_PAGE=""
for arg in "$@"; do
  case "$arg" in
    --open=swagger)
      OPEN_PAGE="swagger"
      shift
      ;;
    --open=auth)
      OPEN_PAGE="auth"
      shift
      ;;
    *)
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load environment from .env if present (ignore comments/blank lines)
if [[ -f .env ]]; then
  echo "Loading environment from .env"
  # This simple parser supports KEY=VALUE per line without spaces around '='
  # Lines with spaces or special characters may require quoting in your shell
  set -a
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | xargs) || true
  set +a
fi

# Default to Development if not set
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

echo "Starting StravaStats.Api (Environment: $ASPNETCORE_ENVIRONMENT)"
dotnet restore
dotnet build

# Determine URLs from launchSettings.json defaults
HTTP_URL="http://localhost:5185"
HTTPS_URL="https://localhost:7185"

# Function to open a URL using best-effort approach
open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" || true
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$url" || true
  else
    echo "Open a browser to: $url"
  fi
}

if [[ -n "$OPEN_PAGE" ]]; then
  # Run the app in background to allow opening the browser shortly after startup
  dotnet run --project src/StravaStats.Api &
  APP_PID=$!
  # Give the server a moment to start
  sleep 1.5
  case "$OPEN_PAGE" in
    swagger)
      echo "Opening Swagger UI..."
      open_url "$HTTPS_URL/swagger"
      ;;
    auth)
      echo "Opening Strava auth login page..."
      open_url "$HTTP_URL/auth/login"
      ;;
  esac
  # Wait on the app process to keep logs in this terminal
  wait $APP_PID
else
  exec dotnet run --project src/StravaStats.Api
fi
