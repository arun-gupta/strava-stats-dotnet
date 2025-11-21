#!/usr/bin/env bash
# Simple launcher for the StravaStats API
# - Loads .env if present
# - Sets a sensible default environment
# - Restores, builds, and runs the API project
# - Optional: opens a browser page after start (--open=swagger|auth)

set -euo pipefail

OPEN_PAGE="auth"
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

# Ensure runtime dir for pid files
RUN_DIR=".run"
PID_FILE="$RUN_DIR/strava-api.pid"
mkdir -p "$RUN_DIR"

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

clean_existing_listeners() {
  # Try to stop previously started process (from pid file)
  if [[ -f "$PID_FILE" ]]; then
    OLD_PID="$(cat "$PID_FILE" || true)"
    if [[ -n "${OLD_PID:-}" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo "Stopping previous API process (pid $OLD_PID)"
      kill "$OLD_PID" 2>/dev/null || true
      # give it a moment, then force if needed
      sleep 0.5
      if kill -0 "$OLD_PID" 2>/dev/null; then
        kill -9 "$OLD_PID" 2>/dev/null || true
      fi
    fi
    rm -f "$PID_FILE" || true
  fi

  # As a fallback, free the dev ports if occupied (macOS/Linux)
  for PORT in 5185 7185; do
    if command -v lsof >/dev/null 2>&1; then
      PIDS=$(lsof -ti ":$PORT" || true)
      if [[ -n "$PIDS" ]]; then
        echo "Freeing port $PORT (killing: $PIDS)"
        kill $PIDS 2>/dev/null || true
        sleep 0.3
        # force kill if still alive
        PIDS2=$(lsof -ti ":$PORT" || true)
        if [[ -n "$PIDS2" ]]; then
          kill -9 $PIDS2 2>/dev/null || true
        fi
      fi
    fi
  done
}

clean_existing_listeners

if [[ -n "$OPEN_PAGE" ]]; then
  # Run the app in background to allow opening the browser shortly after startup
  dotnet run --project src/StravaStats.Api &
  APP_PID=$!
  echo "$APP_PID" > "$PID_FILE" 2>/dev/null || true
  # Wait for the server to become healthy (poll health endpoint up to ~20s)
  HEALTH_URL="http://localhost:5185/health"
  echo "Waiting for API to become available at $HEALTH_URL ..."
  for i in {1..40}; do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      echo "API is up."
      break
    fi
    sleep 0.5
  done
  case "$OPEN_PAGE" in
    swagger)
      echo "Opening Swagger UI..."
      open_url "$HTTPS_URL/swagger"
      ;;
    auth)
      echo "Opening Strava auth login page..."
      echo "URL: $HTTP_URL/auth/login"
      open_url "$HTTP_URL/auth/login"
      ;;
  esac
  # Wait on the app process to keep logs in this terminal
  wait $APP_PID
else
  clean_existing_listeners
  exec dotnet run --project src/StravaStats.Api
fi
