#!/bin/bash
# Runs every manual suite against a throwaway database, start to finish.
#
# Usage: bash scripts/manual-tests/run-all.sh
set -u

DB=cp_manual_$$

# Two ways in: a local Postgres over the unix socket (developer machines), or
# CI_DATABASE_URL pointing at one over TCP (the CI service container). The
# throwaway database is created either way — nothing here runs against a
# database that already has data in it.
if [ -n "${CI_DATABASE_URL:-}" ]; then
  ADMIN_URL="$CI_DATABASE_URL"
  # Swap only the database name, keeping credentials, host and any query string.
  # `${url%/*}/$DB` looks equivalent and is not: it mangles a URL carrying
  # ?sslmode=require, which hosted Postgres commonly does.
  export DATABASE_URL=$(python3 -c "
import sys, urllib.parse
url, db = sys.argv[1], sys.argv[2]
parts = urllib.parse.urlsplit(url)
query = f'?{parts.query}' if parts.query else ''
# Rebuilt by hand rather than with urlunsplit, which collapses 'scheme://' to
# 'scheme:/' when there is no host — the shape a unix-socket URL has.
print(f'{parts.scheme}://{parts.netloc}/{db}{query}')
" "$CI_DATABASE_URL" "$DB")
else
  ADMIN_URL=""
  export DATABASE_URL="postgresql:///$DB?host=/var/run/postgresql"
fi

create_database() {
  if [ -n "$ADMIN_URL" ]; then psql "$ADMIN_URL" -q -c "CREATE DATABASE $DB" > /dev/null
  else createdb "$DB"; fi
}
drop_database() {
  if [ -n "$ADMIN_URL" ]; then psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $DB" > /dev/null 2>&1
  else dropdb --if-exists "$DB" 2>/dev/null; fi
}

export JWT_SECRET="test_secret_at_least_32_chars_long_xxxx"
export TOTP_ENCRYPTION_KEY="test_totp_key_at_least_32_chars_xxxxx"
export NODE_ENV=development

# Fake credentials: enough for the OAuth suite to build authorize URLs and
# exercise the state checks. It never reaches a real provider.
export GOOGLE_CLIENT_ID="test-google-id"
export GOOGLE_CLIENT_SECRET="test-google-secret"

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
LOG=$(mktemp)
SERVER_PID=""

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  sleep 1
  drop_database
  rm -f "$LOG"
}
trap cleanup EXIT

# Any free port. Hardcoding one meant a server from another project answered
# our requests, and the whole suite failed for reasons that had nothing to do
# with this code — twice.
pick_free_port() {
  python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()'
}
export API_PORT=$(pick_free_port)
export PORT=$API_PORT
export APP_BASE_URL="http://localhost:$API_PORT"

start_server() {
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null; sleep 1; fi
  # A suite that needs its own server config ships a <suite>.env beside it. The
  # captcha suites need this: one asserts an enforced captcha rejects, another
  # that an unconfigured one fails closed, and neither setting can be the one
  # the other ten suites run under.
  # exec, so the subshell becomes node and $! is node's own pid — otherwise the
  # kill above hits the subshell and leaves the server holding the port.
  ( set -a
    [ -f "$ROOT/scripts/manual-tests/$1.env" ] && . "$ROOT/scripts/manual-tests/$1.env"
    set +a
    exec node "$ROOT/artifacts/api-server/dist/index.mjs" > "$LOG" 2>&1 ) &
  SERVER_PID=$!
  local waited=0
  until curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/auth/session" 2>/dev/null; do
    # Fail loudly rather than let some other listener answer for us.
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "❌ Server o'ldi. Log:"; cat "$LOG"; exit 1
    fi
    if grep -q EADDRINUSE "$LOG" 2>/dev/null; then
      echo "❌ Port $PORT band — server ko'tarilmadi."; exit 1
    fi
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -gt 30 ]; then echo "❌ Server ko'tarilmadi:"; cat "$LOG"; exit 1; fi
  done
}

echo "==> Baza: $DB"
create_database || exit 1
(cd "$ROOT/lib/db" && npx drizzle-kit push --config ./drizzle.config.ts --force > /dev/null 2>&1) || exit 1

echo "==> Build"
(cd "$ROOT/artifacts/api-server" && npm run build > /dev/null 2>&1) || exit 1

echo "==> Port: $API_PORT"

# The auth rate limiter allows 20 requests / 15 min / IP, and every suite here
# runs from one IP. Left alone, the suites exhaust it between them and fail with
# 429s that say nothing about the code.
#
# Restarting the server used to be enough, because the counter was a Map in the
# process. It now lives in Postgres — that was the point, so that it survives an
# instance — and surviving a restart is the same property. So the counters are
# truncated instead. Safe: $DB is created and dropped by this script.
#
# lesson-test-honest reuses the lesson that lesson-test-exploit seeds, so order matters.
SUITES="lesson-test-exploit lesson-test-honest auth-sessions roles-permissions two-factor api-tokens oauth passkeys scoring scoreboard competitions profile validation body-fields modules-certificates csrf captcha captcha-failclosed rate-limit"
FAILED=""

for suite in $SUITES; do
  echo
  echo "############ $suite ############"
  psql "$DATABASE_URL" -q -c "TRUNCATE rate_limits" > /dev/null 2>&1
  start_server "$suite"
  output=$(bash "$ROOT/scripts/manual-tests/$suite.sh" 2>&1)
  echo "$output" | grep -E "❌|🎉|⚠️"

  # Three ways to fail, and only the first is obvious. A suite that dies — a
  # syntax error, a missing binary — prints no ❌ at all, so grepping for one
  # marked it PASSED. That happened: body-fields.sh had a quoting error, exited
  # mid-run, and this loop called it green. So a suite must also exit 0 AND say
  # it finished; silence is not success.
  if echo "$output" | grep -q "❌"; then
    FAILED="$FAILED $suite"
  elif ! echo "$output" | grep -q "🎉"; then
    echo "  ❌ to'plam yakuniy xulosasini chiqarmadi — yarim yo'lda o'lgan. Oxiri:"
    echo "$output" | tail -4 | sed 's/^/      /'
    FAILED="$FAILED $suite"
  fi
done

echo
if [ -n "$FAILED" ]; then
  echo "⚠️  Yiqilgan to'plamlar:$FAILED"
  exit 1
fi
echo "🎉 HAMMA TO'PLAM O'TDI"
