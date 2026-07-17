#!/bin/bash
# A cross-site request carrying the session cookie cannot change anything.
#
# There are no CSRF tokens here, and after measuring, there is no gap for them
# to fill. Two things already close it, and this suite exists to keep them shut:
#
#   1. The cookie is SameSite=lax, so a browser will not attach it to a
#      cross-site POST at all.
#   2. The CORS allowlist rejects an unknown Origin with 403 — for real
#      requests, not just preflights. That is the load-bearing one, because it
#      holds even when (1) is turned off.
#
# The case that looks like a hole and is not: a request with no Origin header
# succeeds. Only a non-browser client can omit it — a browser always sends
# Origin on a cross-site state-changing request — and a non-browser client has
# no way to obtain the victim's cookie. curl is not a CSRF vector.
#
# The reason this is pinned rather than trusted: the whole defence is one
# allowlist and one throw. Adding a wildcard origin, or answering a rejected
# origin with anything other than an error, silently reopens all of it, and
# nothing else in the suite would notice.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

N="csrf$RANDOM$RANDOM"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"email\":\"$N@example.com\",\"password\":\"$PASS\"}"
# The cookie is the CSRF surface; a Bearer token is not, since an attacker's
# page cannot read or replay one.
curl -s -c "$JAR" -o /dev/null -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"password\":\"$PASS\"}"
ID=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE nickname='$N'")

echo "=== Asos: cookie haqiqatan ishlaydi (aks holda quyidagilar bekorga o'tadi) ==="
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' $API/auth/me)" "200" "cookie bilan /auth/me → 200"

echo
echo "=== ⭐ evil.com cookie bilan holatni o'zgartira olmaydi ==="
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X PATCH $API/users/$ID \
  -H 'Origin: https://evil.com' -H 'Content-Type: application/json' -d '{"nickname":"pwned"}')" "403" \
  "saytlararo JSON PATCH rad etildi"

echo
echo "=== ⭐ Klassik forma hujumi ham (preflight'siz 'simple request') ==="
# The bypass that matters: a <form> POST is a simple request, so the browser
# sends it without asking permission first. The check must reject the real
# request, not merely fail a preflight that never happens.
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST $API/auth/logout \
  -H 'Origin: https://evil.com' -H 'Content-Type: application/x-www-form-urlencoded' -d 'a=1')" "403" \
  "saytlararo forma POST rad etildi"

echo
echo "=== Hech narsa o'zgarmadi (403 javobi emas, BAZA guvohlik beradi) ==="
check "$(psql "$DATABASE_URL" -tAqc "SELECT nickname FROM users WHERE id=$ID")" "$N" "nickname tegilmagan"
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' $API/auth/me)" "200" "sessiya tirik (logout o'tmagan)"

echo
echo "=== Ruxsat berilgan origin ishlaydi (himoya haqiqiy foydalanuvchini to'smaydi) ==="
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X PATCH $API/users/$ID \
  -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' -d "{\"nickname\":\"${N}ok\"}")" "200" \
  "ruxsat berilgan origin'dan PATCH → 200"

echo
[ -z "${FAILED:-}" ] && echo "🎉 SAYTLARARO SO'ROV HECH NARSA QILA OLMAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
