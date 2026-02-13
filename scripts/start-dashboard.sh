#!/usr/bin/env bash
# Start the Analyst Dashboard
# Usage: bash scripts/start-dashboard.sh
# Port: DASHBOARD_PORT env var or 3456

set -e
cd "$(dirname "$0")/../dashboard"
[[ -d node_modules ]] || npm install
exec npm start
