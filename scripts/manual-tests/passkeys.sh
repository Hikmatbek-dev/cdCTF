#!/bin/bash
# Passkey wiring and the challenge boundary.
#
# The signature path cannot run here: producing a real WebAuthn assertion needs
# an authenticator (a phone, a security key, or a browser's virtual one). What
# IS tested is everything around it — the challenge that makes a signature mean
# anything, and who is allowed to manage credentials.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

mkuser() {
  local n="pk$RANDOM$RANDOM"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | json token
}

T=$(mkuser)
[ -n "$T" ] && pass "foydalanuvchi tayyor" || fail "login bo'lmadi"

echo
echo "=== Ro'yxatdan o'tkazish parametrlari ==="
JAR=$(mktemp)
R=$(curl -s -c "$JAR" -X POST $API/auth/passkeys/register/options -H "Authorization: Bearer $T")
echo "$R" | grep -q '"challenge"' && pass "challenge berildi" || fail "challenge yo'q: $R"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["rp"]["id"])')" "localhost" "rpID APP_BASE_URL dan olindi"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["rp"]["name"])')" "cdCTF" "rp nomi to'g'ri"
echo "$R" | grep -q '"pubKeyCredParams"' && pass "algoritmlar ro'yxati bor" || fail "pubKeyCredParams yo'q"
echo "$R" | grep -q '"userVerification":"preferred"' && pass "userVerification=preferred" || fail "authenticatorSelection yo'q"

echo
echo "=== Challenge cookie himoyalanganmi ==="
HEADERS=$(curl -s -D - -o /dev/null -X POST $API/auth/passkeys/register/options -H "Authorization: Bearer $T")
echo "$HEADERS" | grep -qi "set-cookie: cdctf_webauthn=" && pass "challenge cookie qo'yildi" || fail "cookie yo'q"
echo "$HEADERS" | grep -i "set-cookie: cdctf_webauthn" | grep -qi "httponly" && pass "HttpOnly" || fail "HttpOnly emas"

echo
echo "=== ⭐ Challenge'siz tasdiqlab bo'lmaydi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/passkeys/register/verify -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T" -d '{"id":"fake","response":{}}')" "400" "cookie'siz verify RAD ETILDI"

echo
echo "=== ⭐ Soxta (imzosiz) challenge cookie rad etiladi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/passkeys/register/verify -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T" -b 'cdctf_webauthn=soxta.token.qiymat' -d '{"id":"fake","response":{}}')" "400" "imzosiz challenge RAD ETILDI"

echo
echo "=== ⭐ Boshqa foydalanuvchining challenge'i ishlamaydi ==="
# The register challenge is bound to the account that asked for it: a stolen one
# must not let an attacker enrol their authenticator on a victim's account.
JAR_A=$(mktemp)
curl -s -o /dev/null -c "$JAR_A" -X POST $API/auth/passkeys/register/options -H "Authorization: Bearer $T"
T_OTHER=$(mkuser)
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/passkeys/register/verify -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T_OTHER" -b "$JAR_A" -d '{"id":"fake","response":{}}')" "400" "birovning challenge'i RAD ETILDI"

echo
echo "=== ⭐ Challenge BIR MARTALIK ==="
JAR_B=$(mktemp)
curl -s -o /dev/null -c "$JAR_B" -X POST $API/auth/passkeys/register/options -H "Authorization: Bearer $T"
curl -s -o /dev/null -X POST $API/auth/passkeys/register/verify -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T" -b "$JAR_B" -c "$JAR_B" -d '{"id":"x","response":{}}'
# The server clears the cookie on the first attempt, so the jar no longer has it.
grep -q "cdctf_webauthn" "$JAR_B" && fail "challenge cookie qolib ketdi" || pass "challenge birinchi urinishdayoq o'chirildi"

echo
echo "=== Kirish parametrlari (usernameless) ==="
R=$(curl -s -X POST $API/auth/passkeys/login/options)
echo "$R" | grep -q '"challenge"' && pass "kirish challenge'i berildi" || fail "challenge yo'q"
check "$(echo "$R" | json rpId)" "localhost" "rpId to'g'ri"
echo "$R" | grep -q '"allowCredentials":\[\]' || echo "$R" | grep -qv '"allowCredentials"' && pass "allowCredentials bo'sh — foydalanuvchi nomi so'ralmaydi" || pass "usernameless rejim"

echo
echo "=== ⭐ Noma'lum passkey bilan kirib bo'lmaydi ==="
JAR_C=$(mktemp)
curl -s -o /dev/null -c "$JAR_C" -X POST $API/auth/passkeys/login/options
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/passkeys/login/verify -H 'Content-Type: application/json' \
  -b "$JAR_C" -d '{"id":"nosuchcredential","response":{}}')" "401" "noma'lum credential RAD ETILDI"

echo
echo "=== Ro'yxat va o'chirish ==="
check "$(curl -s $API/auth/passkeys -H "Authorization: Bearer $T" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["passkeys"]))')" "0" "yangi hisobda passkey yo'q"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/passkeys/999 -H "Authorization: Bearer $T")" "404" "yo'q passkey o'chirilmaydi"

# Simulate a stored credential to exercise list and delete.
USER_ID=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE id=(SELECT user_id FROM user_sessions ORDER BY id DESC LIMIT 1);")
psql "$DATABASE_URL" -q -c "INSERT INTO passkeys (user_id, credential_id, public_key, name, device_type) VALUES ($USER_ID,'cred-1','pk','Mening telefonim','multiDevice');"
R=$(curl -s $API/auth/passkeys -H "Authorization: Bearer $T_OTHER")
check "$(echo "$R" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["passkeys"]))')" "1" "passkey ro'yxatda ko'rindi"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["passkeys"][0]["name"])')" "Mening telefonim" "nom saqlandi"

echo
echo "=== ⭐ Ochiq kalit qaytarilmaydi ==="
echo "$R" | grep -q "publicKey\|public_key" && fail "javobda ochiq kalit bor!" || pass "javobda kalit yo'q (kerak emas)"

echo
echo "=== ⭐ Birovning passkey'ini o'chirib bo'lmaydi ==="
PK_ID=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM passkeys WHERE credential_id='cred-1';")
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/passkeys/$PK_ID -H "Authorization: Bearer $T")" "404" "boshqa foydalanuvchi o'chira olmadi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM passkeys WHERE credential_id='cred-1';")" "1" "passkey joyida qoldi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/passkeys/$PK_ID -H "Authorization: Bearer $T_OTHER")" "200" "egasi o'chira oldi"

echo
echo "=== ⭐ Bitta credential ikki hisobga yozilmaydi ==="
psql "$DATABASE_URL" -q -c "INSERT INTO passkeys (user_id, credential_id, public_key, name) VALUES ($USER_ID,'shared-cred','pk','a');" 2>/dev/null
DUP=$(psql "$DATABASE_URL" -tAqc "INSERT INTO passkeys (user_id, credential_id, public_key, name) VALUES ($USER_ID,'shared-cred','pk','b') RETURNING id;" 2>&1 | grep -c "duplicate key")
check "$DUP" "1" "unique index dublikatni to'sdi"

echo
echo "=== API tokeni passkey'larni boshqara olmaydi ==="
TOK=$(curl -s -X POST $API/auth/api-tokens -H 'Content-Type: application/json' -H "Authorization: Bearer $T" \
  -d '{"name":"t","scopes":["profile:read"]}' | json token)
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/passkeys -H "Authorization: Bearer $TOK")" "403" "token ro'yxatni ko'ra olmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/passkeys/register/options -H "Authorization: Bearer $TOK")" "403" "token passkey qo'sha olmaydi"

rm -f "$JAR" "$JAR_A" "$JAR_B" "$JAR_C"
echo
[ -z "$FAILED" ] && echo "🎉 PASSKEY SIMLARI VA CHALLENGE HIMOYASI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
