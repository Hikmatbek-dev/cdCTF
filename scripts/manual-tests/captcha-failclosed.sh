#!/bin/bash
# A captcha the server cannot verify blocks registration; it does not wave it
# through. Config: captcha-failclosed.env — enforced, but no secret key.
#
# This is the failure mode worth pinning. Protection that silently stops
# protecting looks identical to protection that works, right up until it
# matters, and half-finished deploys are how it happens.
API=http://localhost:${API_PORT:-8099}/api

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

N="fc$RANDOM$RANDOM"
body() { echo "{\"nickname\":\"$1\",\"email\":\"$1@e.com\",\"password\":\"Abcdefgh1!\"${2:-}}"; }
reg() {
  curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/register \
    -H 'Content-Type: application/json' -d "$1"
}

echo "=== ⭐ Kalitsiz server tokenni TASDIQLAY OLMAYDI → rad etadi ==="
check "$(reg "$(body ${N}a ',"captchaToken":"any-token"')")" "400" "tasdiqlab bo'lmagan token rad etildi"
check "$(reg "$(body ${N}b)")" "400" "tokensiz ham rad etildi"

echo
echo "=== Hisob YARATILMADI (javob 400, lekin baza nima deydi?) ==="
# The HTTP code is not the claim. A route that answers 400 after writing the row
# would pass the checks above and still be wrong.
COUNT=$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM users WHERE nickname LIKE '${N}%'")
check "$COUNT" "0" "bazada ${N}* foydalanuvchi yo'q"

echo
[ -z "$FAILED" ] && echo "🎉 YOPIQ HOLATDA YIQILADI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
