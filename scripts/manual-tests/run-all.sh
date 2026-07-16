#!/bin/bash
# Runs every manual suite against a throwaway database, start to finish.
#
# The server is restarted between suites on purpose: the auth rate limiter
# (20 requests / 15 min / IP) lives in memory, and running the suites
# back-to-back from one IP exhausts it — every login then 429s and the suites
# fail with 401s that have nothing to do with the code.
#
# Usage: bash scripts/manual-tests/run-all.sh
set -u

DB=cp_manual_$$
export DATABASE_URL="postgresql:///$DB?host=/var/run/postgresql"
export JWT_SECRET="test_secret_at_least_32_chars_long_xxxx"
export TOTP_ENCRYPTION_KEY="test_totp_key_at_least_32_chars_xxxxx"
export PORT=8099
export NODE_ENV=development

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
LOG=$(mktemp)
SERVER_PID=""

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  sleep 1
  dropdb --if-exists "$DB" 2>/dev/null
  rm -f "$LOG"
}
trap cleanup EXIT

start_server() {
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null; sleep 1; fi
  node "$ROOT/artifacts/api-server/dist/index.mjs" > "$LOG" 2>&1 &
  SERVER_PID=$!
  local waited=0
  until curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/auth/session" 2>/dev/null; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -gt 30 ]; then
      echo "Server ko'tarilmadi:"
      cat "$LOG"
      exit 1
    fi
  done
}

echo "==> Baza: $DB"
createdb "$DB" || exit 1
(cd "$ROOT/lib/db" && npx drizzle-kit push --config ./drizzle.config.ts --force > /dev/null 2>&1) || exit 1

echo "==> Build"
(cd "$ROOT/artifacts/api-server" && npm run build > /dev/null 2>&1) || exit 1

# lesson-test-honest reuses the lesson that lesson-test-exploit seeds, so order matters.
SUITES="lesson-test-exploit lesson-test-honest auth-sessions roles-permissions two-factor"
FAILED=""

for suite in $SUITES; do
  echo
  echo "############ $suite ############"
  start_server
  output=$(bash "$ROOT/scripts/manual-tests/$suite.sh" 2>&1)
  echo "$output" | grep -E "❌|🎉|⚠️"
  echo "$output" | grep -q "❌" && FAILED="$FAILED $suite"
done

echo
if [ -n "$FAILED" ]; then
  echo "⚠️  Yiqilgan to'plamlar:$FAILED"
  exit 1
fi
echo "🎉 HAMMA TO'PLAM O'TDI"
