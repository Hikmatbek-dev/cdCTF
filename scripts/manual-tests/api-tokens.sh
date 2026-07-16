#!/bin/bash
# Personal access tokens: creation, scopes, and — the point of the exercise —
# everything a token must NOT be able to do, including when minted by an admin.
API=http://localhost:8099/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

mkuser() { # $1 = role
  local n="tok$1$RANDOM$RANDOM"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  [ "$1" != "user" ] && psql "$DATABASE_URL" -q -c "UPDATE users SET role='$1' WHERE nickname='$n';"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | json token
}

mktoken() { # $1 = session token, $2 = scopes json array
  curl -s -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $1" -d "{\"name\":\"test\",\"scopes\":$2}" | json token
}

SESSION=$(mkuser user)
[ -n "$SESSION" ] && pass "foydalanuvchi tayyor" || fail "login bo'lmadi"

echo
echo "=== Token yaratish ==="
R=$(curl -s -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SESSION" -d '{"name":"CI skript","scopes":["ctf:read","scoreboard:read"]}')
TOKEN=$(echo "$R" | json token)
echo "$TOKEN" | grep -q "^cdctf_" && pass "token cdctf_ prefiksi bilan (${TOKEN:0:14}...)" || fail "format noto'g'ri: $R"
[ ${#TOKEN} -gt 40 ] && pass "token yetarlicha uzun (${#TOKEN} belgi)" || fail "juda qisqa"

echo
echo "=== Token bazada HASHLANGAN, ochiq emas ==="
STORED=$(psql "$DATABASE_URL" -tAqc "SELECT token_hash FROM api_tokens LIMIT 1;")
[ ${#STORED} -eq 64 ] && pass "sha256 hash (64 belgi)" || fail "hash emas: $STORED"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM api_tokens WHERE token_hash LIKE 'cdctf_%';")" "0" "ochiq token saqlanmagan"

echo
echo "=== Token faqat BIR MARTA ko'rsatiladi ==="
LIST=$(curl -s $API/auth/api-tokens -H "Authorization: Bearer $SESSION")
echo "$LIST" | grep -q "$TOKEN" && fail "ro'yxatda to'liq token qaytdi!" || pass "ro'yxatda to'liq token yo'q"
echo "$LIST" | grep -q "cdctf_" && pass "faqat prefiks ko'rsatilgan" || fail "prefiks yo'q"

echo
echo "=== Token ruxsat berilgan scope'larda ISHLAYDI ==="
check "$(curl -s -o /dev/null -w '%{http_code}' $API/ctf -H "Authorization: Bearer $TOKEN")" "200" "ctf:read → /ctf 200"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/scoreboard -H "Authorization: Bearer $TOKEN")" "200" "scoreboard:read → /scoreboard 200"

echo
echo "=== ⭐ Scope'lar OCHIQ endpointlarni yopmasligi kerak ==="
# requireScope narrows API tokens; attaching it must not turn a public route into
# an authenticated one. This regressed once already.
check "$(curl -s -o /dev/null -w '%{http_code}' $API/ctf)" "200" "anonim /ctf ni ko'ra oladi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/scoreboard)" "200" "anonim /scoreboard ni ko'ra oladi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/ctf -H "Authorization: Bearer $SESSION")" "200" "sessiya scope'siz ham ishlaydi"

echo
echo "=== ⭐ Token BERILMAGAN scope'da ishlamaydi ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/ctf/1/submit -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"flag":"Flag{x}"}')
check "$CODE" "403" "ctf:submit scope'i yo'q → 403"

echo
echo "=== ⭐ Token PAROL o'zgartira olmaydi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/change-password -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d "{\"oldPassword\":\"$PASS\",\"newPassword\":\"N3w!Passw0rdHere\"}")" "403" "parol o'zgartirish RAD ETILDI"

echo
echo "=== ⭐ Token 2FA'ni o'chira/yoqa olmaydi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/setup -H "Authorization: Bearer $TOKEN")" "403" "2FA setup RAD ETILDI"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/disable -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"password":"x","code":"1"}')" "403" "2FA disable RAD ETILDI"

echo
echo "=== ⭐ Token sessiyalarni boshqara olmaydi (o'zini ham) ==="
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/sessions -H "Authorization: Bearer $TOKEN")" "403" "sessiyalar ro'yxati RAD ETILDI"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/sessions/revoke-all -H "Authorization: Bearer $TOKEN")" "403" "revoke-all RAD ETILDI"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"name":"x","scopes":["ctf:read"]}')" "403" "token boshqa token yarata olmaydi"

echo
echo "=== ⭐⭐ ADMIN yaratgan token ham admin EMAS ==="
ADMIN_SESSION=$(mkuser admin)
ADMIN_TOKEN=$(mktoken "$ADMIN_SESSION" '["ctf:read","profile:read"]')
[ -n "$ADMIN_TOKEN" ] && pass "admin token yaratdi" || fail "admin token yaratolmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/admin/dashboard -H "Authorization: Bearer $ADMIN_SESSION")" "200" "admin SESSIYASI panelga kiradi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/admin/dashboard -H "Authorization: Bearer $ADMIN_TOKEN")" "403" "admin TOKENI panelga KIRA OLMAYDI"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/admin/users -H "Authorization: Bearer $ADMIN_TOKEN")" "403" "admin tokeni foydalanuvchilarni ko'ra olmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/users/1/block -H "Authorization: Bearer $ADMIN_TOKEN")" "403" "admin tokeni bloklay olmaydi"

echo
echo "=== Validatsiya ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SESSION" -d '{"name":"x","scopes":["admin:everything"]}')" "400" "noma'lum scope rad etildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SESSION" -d '{"name":"x","scopes":[]}')" "400" "bo'sh scope rad etildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SESSION" -d '{"scopes":["ctf:read"]}')" "400" "nomsiz token rad etildi"

echo
echo "=== Bekor qilish ==="
# Checked against /auth/me, not /ctf: /ctf is optionalAuth, so a dead token there
# just degrades to anonymous and still answers 200. Revocation only shows up on a
# route that actually requires authentication.
T_ME=$(mktoken "$SESSION" '["profile:read"]')
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $T_ME")" "200" "profile:read → /auth/me 200"
ME_ID=$(curl -s $API/auth/api-tokens -H "Authorization: Bearer $SESSION" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["tokens"][0]["id"])')
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/auth/api-tokens/$ME_ID -H "Authorization: Bearer $SESSION")" "200" "token bekor qilindi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $T_ME")" "401" "bekor qilingan token RAD ETILDI"

echo
echo "=== ⭐ Bloklangan foydalanuvchi tokeni ham o'ladi ==="
T2=$(mktoken "$SESSION" '["profile:read"]')
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $T2")" "200" "yangi token ishlaydi"
psql "$DATABASE_URL" -q -c "UPDATE users SET is_blocked=true WHERE id=(SELECT user_id FROM api_tokens WHERE revoked_at IS NULL ORDER BY id DESC LIMIT 1);"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $T2")" "401" "bloklangach token DARHOL o'ldi"

echo
[ -z "$FAILED" ] && echo "🎉 API TOKENLAR TO'G'RI CHEKLANGAN" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
