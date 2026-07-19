#!/bin/bash
# OAuth wiring and — the part that matters — the CSRF boundary.
#
# The happy path (token exchange, profile fetch) cannot run here: it needs real
# credentials from Google/GitHub/Discord and a browser round-trip. What IS
# tested is everything that decides whether a callback is trustworthy, which is
# where an OAuth bug hands an attacker someone else's account.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

# Follows no redirects: we want to inspect the Location header itself.
loc() { curl -s -o /dev/null -w '%{redirect_url}' "$@"; }

# run-all.sh configures Google with fake credentials and leaves GitHub and
# Discord unset, so both branches are reachable against one server.
echo "=== Faqat kalit berilgan provayder ro'yxatda ==="
LIST=$(curl -s $API/auth/oauth/providers | python3 -c 'import sys,json; print(",".join(json.load(sys.stdin)["providers"]))')
check "$LIST" "google" "faqat sozlangan provayder ko'rsatildi (github/discord yo'q)"

echo
echo "=== Sozlanmagan va noma'lum provayderlar ==="
echo "$(loc $API/auth/oauth/github)" | grep -q "oauth_error=provider_not_configured" \
  && pass "kalitsiz github rad etildi" || fail "kalitsiz github o'tkazildi"
echo "$(loc $API/auth/oauth/discord)" | grep -q "oauth_error=provider_not_configured" \
  && pass "kalitsiz discord rad etildi" || fail "kalitsiz discord o'tkazildi"
echo "$(loc $API/auth/oauth/nosuchprovider)" | grep -q "oauth_error=unknown_provider" \
  && pass "noma'lum provayder rad etildi" || fail "noma'lum provayder o'tkazildi"

echo
echo "=== Sozlangan provayder: authorize URL to'g'ri quriladimi ==="
# The server is started with fake credentials for this suite, so it builds the
# redirect without ever calling Google.
URL=$(loc $API/auth/oauth/google)
echo "$URL" | grep -q "^https://accounts.google.com/o/oauth2/v2/auth" && pass "Google'ga yo'naltirdi" || fail "noto'g'ri manzil: $URL"
echo "$URL" | grep -q "client_id=test-google-id" && pass "client_id qo'shildi" || fail "client_id yo'q"
EXPECTED_CB=$(python3 -c "import urllib.parse,os; print(urllib.parse.quote(os.environ['APP_BASE_URL'] + '/api/auth/oauth/google/callback', safe=''))")
echo "$URL" | grep -q "redirect_uri=$EXPECTED_CB" && pass "redirect_uri APP_BASE_URL dan qurildi" || fail "redirect_uri noto'g'ri"
echo "$URL" | grep -q "scope=openid" && pass "scope bor" || fail "scope yo'q"
echo "$URL" | grep -q "state=" && pass "state parametri bor" || fail "state yo'q"
echo "$URL" | grep -q "prompt=select_account" && pass "hisob tanlash majburlandi" || fail "prompt yo'q"

echo
echo "=== state cookie qo'yiladimi va himoyalanganmi ==="
HEADERS=$(curl -s -D - -o /dev/null $API/auth/oauth/google)
echo "$HEADERS" | grep -qi "set-cookie: cdctf_oauth_state=" && pass "state cookie qo'yildi" || fail "cookie yo'q"
echo "$HEADERS" | grep -i "set-cookie: cdctf_oauth_state" | grep -qi "httponly" && pass "cookie HttpOnly" || fail "HttpOnly emas"
echo "$HEADERS" | grep -i "set-cookie: cdctf_oauth_state" | grep -qi "samesite=lax" && pass "cookie SameSite=Lax" || fail "SameSite yo'q"

echo
echo "=== ⭐ CSRF: state'siz callback RAD ETILADI ==="
echo "$(loc "$API/auth/oauth/google/callback?code=stolen_code&state=attacker")" | grep -q "oauth_error=invalid_state" \
  && pass "cookie'siz callback rad etildi" || fail "cookie'siz callback o'tdi!"

echo
echo "=== ⭐ CSRF: state cookie va state parametri MOS KELMASA rad etiladi ==="
JAR=$(mktemp)
curl -s -o /dev/null -c "$JAR" $API/auth/oauth/google   # haqiqiy state cookie olamiz
echo "$(loc -b "$JAR" "$API/auth/oauth/google/callback?code=x&state=boshqa_nonce")" | grep -q "oauth_error=invalid_state" \
  && pass "nonce mos kelmasa rad etildi" || fail "nonce tekshirilmadi!"

echo
echo "=== ⭐ CSRF: soxta (imzosiz) state cookie rad etiladi ==="
echo "$(loc -b "cdctf_oauth_state=soxta.token.qiymat" "$API/auth/oauth/google/callback?code=x&state=soxta")" \
  | grep -q "oauth_error=invalid_state" && pass "imzosiz cookie rad etildi" || fail "imzo tekshirilmadi!"

echo
echo "=== ⭐ To'g'ri state bilan ham: kod soxta bo'lsa provayder xatosi ==="
# Proves the state check passes and the flow proceeds to the exchange, which
# then fails against the real Google with fake credentials — as it should.
JAR2=$(mktemp)
NONCE=$(curl -s -o /dev/null -c "$JAR2" -w '%{redirect_url}' $API/auth/oauth/google | grep -oP 'state=\K[^&]+')
[ -n "$NONCE" ] && pass "state nonce olindi (${NONCE:0:10}...)" || fail "nonce topilmadi"
echo "$(loc -b "$JAR2" "$API/auth/oauth/google/callback?code=fake&state=$NONCE")" | grep -q "oauth_error=provider_error" \
  && pass "state O'TDI, keyin soxta kod provayderda yiqildi" || fail "kutilmagan natija"

echo
echo "=== Provayder rad etsa xato uzatiladi ==="
echo "$(loc "$API/auth/oauth/google/callback?error=access_denied&state=x")" | grep -q "oauth_error=access_denied" \
  && pass "foydalanuvchi rad etishi uzatildi" || fail "xato uzatilmadi"

echo
echo "=== Bog'lash uchun avval kirish kerak ==="
echo "$(loc "$API/auth/oauth/google?mode=link")" | grep -q "oauth_error=sign_in_first" \
  && pass "kirmasdan bog'lab bo'lmaydi" || fail "kirmasdan bog'lash mumkin!"

echo
echo "=== Bog'langan hisoblar ro'yxati va uzish ==="
NICK="oauth$RANDOM"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"email\":\"$NICK@example.com\",\"password\":\"$PASS\"}"
T=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
N=$(curl -s $API/auth/oauth/accounts -H "Authorization: Bearer $T" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["accounts"]))')
check "$N" "0" "yangi hisobda bog'langan provayder yo'q"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/oauth/google -H "Authorization: Bearer $T")" "404" "bog'lanmaganini uzib bo'lmaydi"

# Simulate a link, then unlink it through the API.
USER_ID=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE nickname='$NICK';")
psql "$DATABASE_URL" -q -c "INSERT INTO oauth_accounts (user_id, provider, provider_account_id, provider_email) VALUES ($USER_ID,'google','g-123','$NICK@gmail.com');"
N=$(curl -s $API/auth/oauth/accounts -H "Authorization: Bearer $T" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["accounts"]))')
check "$N" "1" "bog'langan hisob ro'yxatda ko'rindi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/oauth/google -H "Authorization: Bearer $T")" "200" "uzildi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM oauth_accounts WHERE user_id=$USER_ID;")" "0" "bazadan o'chdi"

echo
echo "=== ⭐ Bitta provayder hisobi IKKI foydalanuvchiga bog'lanmaydi ==="
psql "$DATABASE_URL" -q -c "INSERT INTO oauth_accounts (user_id, provider, provider_account_id) VALUES ($USER_ID,'google','shared-1');" 2>/dev/null
DUP=$(psql "$DATABASE_URL" -tAqc "INSERT INTO oauth_accounts (user_id, provider, provider_account_id) VALUES ($USER_ID,'google','shared-1') RETURNING id;" 2>&1 | grep -c "duplicate key")
check "$DUP" "1" "unique index dublikatni to'sdi"

echo
echo "=== API tokeni OAuth'ni boshqara olmaydi ==="
TOK=$(curl -s -X POST $API/auth/api-tokens -H 'Content-Type: application/json' -H "Authorization: Bearer $T" \
  -d '{"name":"t","scopes":["profile:read"]}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/oauth/accounts -H "Authorization: Bearer $TOK")" "403" "token ro'yxatni ko'ra olmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/oauth/google -H "Authorization: Bearer $TOK")" "403" "token uza olmaydi"

rm -f "$JAR" "$JAR2"
echo
[ -z "$FAILED" ] && echo "🎉 OAUTH SIMLARI VA CSRF HIMOYASI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
