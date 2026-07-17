#!/bin/bash
# The tests and production build the database two different ways. This proves
# they land in the same place.
#
#   tests:      drizzle-kit push, from lib/db/src/schema/*.ts
#   production: supabase-schema.sql by hand in the Supabase SQL editor, then
#               ensureDatabaseShape() at every cold start, from database.ts
#
# Nothing runs drizzle-kit push against production. So the drizzle schema — the
# one the tests run on, and the one the types come from — is not what production
# has. They agree today, checked column by column. Nothing was making them.
#
# That is the whole point of this suite: a divergence would not break a test, it
# would ship. The failure mode is a query that passes CI and 500s in production
# against a column that only ever existed in the test database.
#
# Standalone: it builds two databases and needs its own, so it is not part of
# run-all.sh's shared-server loop. CI runs it as a separate step.
set -u

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
S=$(mktemp -d)
DRZ=cp_parity_drz_$$
PROD=cp_parity_prod_$$

if [ -n "${CI_DATABASE_URL:-}" ]; then
  ADMIN_URL="$CI_DATABASE_URL"
  url_for() {
    python3 -c "
import sys, urllib.parse
parts = urllib.parse.urlsplit(sys.argv[1])
query = f'?{parts.query}' if parts.query else ''
print(f'{parts.scheme}://{parts.netloc}/{sys.argv[2]}{query}')
" "$CI_DATABASE_URL" "$1"
  }
  create_db() { psql "$ADMIN_URL" -q -c "CREATE DATABASE $1" > /dev/null; }
  drop_db() { psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $1" > /dev/null 2>&1; }
else
  url_for() { echo "postgresql:///$1?host=/var/run/postgresql"; }
  create_db() { createdb "$1"; }
  drop_db() { dropdb --if-exists "$1" 2>/dev/null; }
fi

cleanup() { drop_db "$DRZ"; drop_db "$PROD"; rm -rf "$S"; }
trap cleanup EXIT

export JWT_SECRET="test_secret_at_least_32_chars_long_xxxx"
export TOTP_ENCRYPTION_KEY="test_totp_key_at_least_32_chars_xxxxx"
export NODE_ENV=development

# Built here rather than assumed: this suite boots the server to run its DDL,
# and a stale dist would compare the schema of whatever was built last.
echo "==> Build"
( cd "$ROOT/artifacts/api-server" && npm run build ) > "$S/build.log" 2>&1 \
  || { echo "  ❌ build yiqildi:"; tail -5 "$S/build.log"; exit 1; }

echo "==> A: testlar qanday quradi (drizzle-kit push)"
create_db "$DRZ" || exit 1
( cd "$ROOT/lib/db" && DATABASE_URL=$(url_for "$DRZ") npx drizzle-kit push --config ./drizzle.config.ts --force ) > "$S/push.log" 2>&1 \
  || { echo "  ❌ drizzle push yiqildi:"; tail -5 "$S/push.log"; exit 1; }

echo "==> B: production qanday quradi (supabase-schema.sql + ensureDatabaseShape)"
create_db "$PROD" || exit 1
psql -q "$(url_for "$PROD")" -f "$ROOT/supabase-schema.sql" > "$S/sql.log" 2>&1 \
  || { echo "  ❌ supabase-schema.sql yiqildi:"; tail -5 "$S/sql.log"; exit 1; }

PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
DATABASE_URL=$(url_for "$PROD") PORT=$PORT node "$ROOT/artifacts/api-server/dist/index.mjs" > "$S/boot.log" 2>&1 &
BOOT_PID=$!
waited=0
until curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/auth/session" 2>/dev/null; do
  sleep 1; waited=$((waited + 1))
  if [ "$waited" -gt 30 ]; then echo "  ❌ Server ko'tarilmadi:"; cat "$S/boot.log"; exit 1; fi
done
kill "$BOOT_PID" 2>/dev/null; wait "$BOOT_PID" 2>/dev/null

# createIndexSafely swallows a failing index and logs instead. That is right at
# runtime — it beats deleting a user's data — but here it would mean an index
# silently missing from prod while the check still passed.
if grep -q "Could not create index" "$S/boot.log"; then
  fail "ensureDatabaseShape indeks yarata olmadi:"
  grep "Could not create index" "$S/boot.log" | head -3 | sed 's/^/      /'
fi

dump() { # $1 = db, $2 = out prefix
  local u; u=$(url_for "$1")
  psql -tAqc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1" "$u" | sort > "$S/$2.tables"
  psql -tAqc "SELECT table_name||'.'||column_name||' :: '||data_type||' null='||is_nullable||' default='||coalesce(column_default,'-') FROM information_schema.columns WHERE table_schema='public' ORDER BY 1" "$u" | sort > "$S/$2.columns"
  psql -tAqc "SELECT c.conrelid::regclass::text||' '||c.contype::text||' '||pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY 1" "$u" | sort > "$S/$2.constraints"
  # The index NAME is dropped on purpose and nothing else is. Drizzle calls a
  # unique index users_email_unique; Postgres, creating the same index from an
  # inline UNIQUE, calls it users_email_key. Same table, same columns, same
  # uniqueness — comparing names would fail on all six of those forever and
  # teach everyone to ignore this suite.
  psql -tAqc "SELECT indexdef FROM pg_indexes WHERE schemaname='public'" "$u" \
    | sed -E 's/INDEX [a-zA-Z0-9_]+ ON/INDEX ON/' | sort > "$S/$2.indexes"
}
dump "$DRZ" drz
dump "$PROD" prod

echo
for what in tables columns constraints indexes; do
  n=$(wc -l < "$S/drz.$what")
  if diff -q "$S/drz.$what" "$S/prod.$what" > /dev/null; then
    pass "$what bir xil ($n)"
  else
    fail "$what FARQ QILADI"
    echo "      --- testda bor, prodda yo'q:"
    comm -23 "$S/drz.$what" "$S/prod.$what" | sed 's/^/        /'
    echo "      --- prodda bor, testda yo'q:"
    comm -13 "$S/drz.$what" "$S/prod.$what" | sed 's/^/        /'
  fi
done

echo
if [ -z "${FAILED:-}" ]; then
  echo "🎉 IKKALA MANBA BIR XIL SXEMA QURADI"
else
  echo "⚠️  SXEMALAR AJRALIB KETDI"
  echo "   Prod supabase-schema.sql + database.ts'dan quriladi; testlar lib/db/src/schema/'dan."
  echo "   Yangi ustun/jadval qo'shganda IKKALASINI ham yangilash kerak."
  exit 1
fi
