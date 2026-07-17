#!/bin/bash
# The auth rate limit holds across instances.
#
# It used to live in a Map in one process. On Vercel that is one counter per
# instance, so the limit was really max × however many instances were up — and
# the burst that trips a limiter is exactly what makes Vercel start more of
# them. The protection thinned under attack, which is when it had to hold.
#
# Measured before the fix, two servers on one database: the first 429s at
# attempt 21 while the second still answered 401 to the same IP.
#
# This suite starts a SECOND server against the same database as the shared one,
# which is the only way to tell a working shared counter from a per-process one
# — every check here passes against the broken version if you only ever ask one
# server. It is run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
LOG=$(mktemp)
cleanup() { [ -n "${PID2:-}" ] && kill "$PID2" 2>/dev/null; rm -f "$LOG"; }
trap cleanup EXIT

login() { # $1 = base url -> http code
  curl -s -o /dev/null -w '%{http_code}' -X POST "$1/auth/login" \
    -H 'Content-Type: application/json' -d '{"nickname":"yoq_bunday_odam","password":"Xxxxxxxx1!"}'
}

echo "=== Ikkinchi serverni bir xil bazada ko'taraman (ikkinchi Vercel instance) ==="
PORT2=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
PORT=$PORT2 node "$ROOT/artifacts/api-server/dist/index.mjs" > "$LOG" 2>&1 &
PID2=$!
API2=http://localhost:$PORT2/api
waited=0
until curl -s -o /dev/null --max-time 1 "$API2/auth/session" 2>/dev/null; do
  if ! kill -0 "$PID2" 2>/dev/null; then echo "  ❌ 2-server o'ldi:"; cat "$LOG"; exit 1; fi
  sleep 1; waited=$((waited + 1))
  if [ "$waited" -gt 30 ]; then echo "  ❌ 2-server ko'tarilmadi:"; cat "$LOG"; exit 1; fi
done
pass "2-server $PORT2-portda, bazasi bir xil"

echo
echo "=== Limitgacha bo'lgan urinishlar o'tadi (429 emas, 401) ==="
# 20 per 15 min. Anything but 401 here means the budget was already spent.
check "$(login $API)" "401" "1-urinish → 401 (limit ishlamadi, hisob yo'q)"

echo
echo "=== 1-serverda limitni tugataman ==="
for i in $(seq 2 21); do login $API > /dev/null; done
check "$(login $API)" "429" "1-server limitni qo'lladi"

echo
echo "=== ⭐ 2-SERVER ham bloklangan (avval bu yerda 401 kelardi) ==="
check "$(login $API2)" "429" "boshqa instance ham 429 qaytardi — hisoblagich umumiy"

echo
echo "=== Retry-After sarlavhasi bor (klient qachon qaytishni bilsin) ==="
RA=$(curl -s -D- -o /dev/null -X POST "$API2/auth/login" -H 'Content-Type: application/json' \
  -d '{"nickname":"yoq_bunday_odam","password":"Xxxxxxxx1!"}' | grep -i '^retry-after:' | tr -d '\r' | awk '{print $2}')
[ -n "$RA" ] && [ "$RA" -gt 0 ] 2>/dev/null && pass "Retry-After: $RA soniya" || fail "Retry-After yo'q yoki noto'g'ri: '$RA'"

echo
echo "=== Hisoblagich bazada, xotirada emas ==="
COUNT=$(psql "$DATABASE_URL" -tAqc "SELECT count FROM rate_limits WHERE key LIKE 'auth:%' ORDER BY count DESC LIMIT 1")
[ -n "$COUNT" ] && [ "$COUNT" -gt 20 ] 2>/dev/null && pass "rate_limits jadvalida auth hisoblagichi = $COUNT" || fail "bazada auth hisoblagichi yo'q: '$COUNT'"

echo
echo "=== Alohida bucket'lar bir-birini bloklamaydi ==="
# auth is spent. mfa_verify has its own prefix, so it must still be open — one
# shared bucket would mean a failed login locks that IP out of finishing 2FA.
#
# 401 means the request reached the handler and was turned away on the token
# being bogus, which is the answer that proves the limiter let it through.
# Both fields are sent on purpose: omitting mfaToken gets a 400 from the
# handler's own check, which would also pass a "not 429" test while proving
# nothing about how far the request actually got.
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' -d '{"mfaToken":"soxta","code":"000000"}')" "401" "mfa_verify hali ochiq (auth tugagan bo'lsa ham)"

echo
[ -z "${FAILED:-}" ] && echo "🎉 LIMIT INSTANCE'LAR ORASIDA UMUMIY" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
