#!/bin/bash

# cdCTF run script

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

API_PORT="${API_PORT:-${PORT:-8080}}"
FRONTEND_PORT="${FRONTEND_PORT:-7000}"

# Kill any existing processes on the configured development ports
echo "Killing existing processes on ports ${API_PORT} and ${FRONTEND_PORT}..."
lsof -ti:"${API_PORT}" | xargs kill -9 2>/dev/null || true
lsof -ti:"${FRONTEND_PORT}" | xargs kill -9 2>/dev/null || true
sleep 2

# Set development defaults without overriding .env
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/cyberplace}"
export PORT="${API_PORT}"
export JWT_SECRET="${JWT_SECRET:-cdctf_dev_secret_change_me}"
export APP_BASE_URL="${APP_BASE_URL:-http://localhost:${FRONTEND_PORT}}"
export RESEND_API_KEY="${RESEND_API_KEY:-}"
export RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}"
export TURNSTILE_SECRET_KEY="${TURNSTILE_SECRET_KEY:-}"
export TURNSTILE_BYPASS_LOCALHOST="${TURNSTILE_BYPASS_LOCALHOST:-true}"
export SENTRY_DSN="${SENTRY_DSN:-}"
export SUPABASE_URL="${SUPABASE_URL:-}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
export SUPABASE_STORAGE_BUCKET="${SUPABASE_STORAGE_BUCKET:-cdctf}"

# Start API server in background
echo "Starting API server on port ${PORT}..."
corepack pnpm --filter api-server run dev &
API_PID=$!

# Wait a bit for API to start
sleep 5

# Start frontend
echo "Starting frontend on port ${FRONTEND_PORT}..."
export PORT="${FRONTEND_PORT}"
export VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY:-}"
export VITE_SENTRY_DSN="${VITE_SENTRY_DSN:-}"
corepack pnpm --filter cyberplace run dev &
FRONTEND_PID=$!

echo "Servers started!"
echo "Frontend: http://localhost:${PORT}"
echo "API: http://localhost:${API_PORT}"
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap "echo 'Stopping servers...'; kill $API_PID $FRONTEND_PID 2>/dev/null || true; exit" INT
wait
