#!/bin/bash
# End-to-end check of the new session layer against a throwaway database.
API=http://localhost:${API_PORT:-8099}/api
UA_A="Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
UA_B="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1 Safari/604.1"
PASS='Str0ng!Passw0rd'
NICK="tester$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3 (kutilgan: $2)" || fail "$3 — kutilgan $2, kelgan $1"; }

echo "=== 1. Ro'yxatdan o'tish ==="
R=$(curl -s -w '\n%{http_code}' -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"email\":\"$NICK@example.com\",\"password\":\"$PASS\"}")
check "$(echo "$R" | tail -1)" "201" "register 201 qaytardi"

echo "=== 2. Login → sessiya yaratiladi ==="
R=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -H "User-Agent: $UA_A" \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}")
TOKEN_A=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')
[ -n "$TOKEN_A" ] && pass "token olindi" || fail "token yo'q: $R"
SUSP=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("suspiciousLogin"))')
check "$SUSP" "None" "birinchi login shubhali deb belgilanmadi"

echo "=== 3. Token ishlayapti ==="
C=$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $TOKEN_A")
check "$C" "200" "/auth/me token bilan ishlaydi"

echo "=== 4. jti da'vosi tokenda bormi ==="
JTI=$(echo "$TOKEN_A" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("jti","YO_Q"))' 2>/dev/null)
[ "$JTI" != "YO_Q" ] && [ -n "$JTI" ] && pass "jti bor: ${JTI:0:8}..." || fail "jti yo'q"

echo "=== 5. Sessiyalar ro'yxati (Device management) ==="
R=$(curl -s $API/auth/sessions -H "Authorization: Bearer $TOKEN_A")
N=$(echo "$R" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["sessions"]))')
check "$N" "1" "1 ta sessiya ko'rinyapti"
DEV=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sessions"][0]["deviceLabel"])')
check "$DEV" "Chrome on Windows" "qurilma nomi to'g'ri aniqlandi"
CUR=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sessions"][0]["isCurrent"])')
check "$CUR" "True" "joriy sessiya belgilangan"

echo "=== 6. Login tarixi ==="
R=$(curl -s "$API/auth/login-history" -H "Authorization: Bearer $TOKEN_A")
N=$(echo "$R" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]))')
check "$N" "1" "1 ta yozuv bor"

echo "=== 7. Ikkinchi qurilmadan login (shubhali bo'lishi kerak) ==="
R=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -H "User-Agent: $UA_B" \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}")
TOKEN_B=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')
REASONS=$(echo "$R" | python3 -c 'import sys,json; d=json.load(sys.stdin).get("suspiciousLogin"); print(",".join(d["reasons"]) if d else "None")')
echo "$REASONS" | grep -q "new_device" && pass "new_device aniqlandi ($REASONS)" || fail "new_device aniqlanmadi: $REASONS"

echo "=== 8. Endi 2 ta sessiya ==="
N=$(curl -s $API/auth/sessions -H "Authorization: Bearer $TOKEN_A" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["sessions"]))')
check "$N" "2" "2 ta sessiya ko'rinyapti"

echo "=== 9. ⭐ LOGOUT TOKENNI O'LDIRADIMI (asosiy sinov) ==="
curl -s -o /dev/null -X POST $API/auth/logout -H "Authorization: Bearer $TOKEN_B"
C=$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $TOKEN_B")
check "$C" "401" "logout qilingan token RAD ETILDI"
C=$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $TOKEN_A")
check "$C" "200" "boshqa qurilma tokeni tirik qoldi"

echo "=== 10. revoke-all: boshqa qurilmalarni chiqarish ==="
curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -H "User-Agent: $UA_B" \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" > /dev/null
R=$(curl -s -X POST $API/auth/sessions/revoke-all -H "Authorization: Bearer $TOKEN_A")
echo "  → $R"
N=$(curl -s $API/auth/sessions -H "Authorization: Bearer $TOKEN_A" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["sessions"]))')
check "$N" "1" "faqat joriy sessiya qoldi"

echo "=== 11. ⭐ BLOKLANGAN FOYDALANUVCHI TOKENI (eski bug) ==="
psql "$DATABASE_URL" -q -c "UPDATE users SET is_blocked = true WHERE nickname = '$NICK';"
C=$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $TOKEN_A")
check "$C" "401" "bloklangan foydalanuvchi tokeni DARHOL rad etildi"
psql "$DATABASE_URL" -q -c "UPDATE users SET is_blocked = false WHERE nickname = '$NICK';"
C=$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $TOKEN_A")
check "$C" "200" "blok olingach yana ishladi"

echo "=== 12. ⭐ ROL DB'DAN O'QILADIMI (JWT'dan emas) ==="
psql "$DATABASE_URL" -q -c "UPDATE users SET role = 'admin' WHERE nickname = '$NICK';"
C=$(curl -s -o /dev/null -w '%{http_code}' $API/admin/dashboard -H "Authorization: Bearer $TOKEN_A")
check "$C" "200" "DB'da admin qilingach ESKI token admin huquqini oldi"
psql "$DATABASE_URL" -q -c "UPDATE users SET role = 'user' WHERE nickname = '$NICK';"
C=$(curl -s -o /dev/null -w '%{http_code}' $API/admin/dashboard -H "Authorization: Bearer $TOKEN_A")
check "$C" "403" "rol pasaytirilgach DARHOL huquq yo'qoldi"

echo "=== 13. Noto'g'ri parol tarixga yozildimi ==="
curl -s -o /dev/null -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"NotTheP4ssword!\"}"
R=$(curl -s "$API/auth/login-history?limit=1" -H "Authorization: Bearer $TOKEN_A")
FR=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["entries"][0]["failureReason"])')
check "$FR" "bad_password" "muvaffaqiyatsiz urinish sababi bilan yozildi"

echo "=== 14. Parol o'zgarishi boshqa sessiyalarni o'ldiradimi ==="
curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -H "User-Agent: $UA_B" \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" > /dev/null
R=$(curl -s -X POST $API/auth/change-password -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"oldPassword\":\"$PASS\",\"newPassword\":\"N3w!Passw0rdHere\"}")
echo "  → $R"
N=$(curl -s $API/auth/sessions -H "Authorization: Bearer $TOKEN_A" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["sessions"]))')
check "$N" "1" "parol o'zgargach faqat joriy sessiya qoldi"

echo
[ -z "$FAILED" ] && echo "🎉 HAMMA SINOV O'TDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
