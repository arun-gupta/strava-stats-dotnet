#!/usr/bin/env bash
# Simple launcher for the StravaStats API
# - Loads .env if present
# - Sets a sensible default environment
# - Restores, builds, and runs the API project

set -euo pipefail

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
exec dotnet run --project src/StravaStats.Api
