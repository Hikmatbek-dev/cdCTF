#!/bin/bash
# TOTP enrolment, the 2FA login handshake, replay protection, and backup codes.
# Real codes are generated from the enrolment secret with otplib, the same way an
# authenticator app would.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
ROOT=$(cd "$(dirname "$0")/../.." && pwd)

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

# Generates a live TOTP code from a base32 secret, exactly like a phone would.
totp() { # $1 = base32 secret
  node --input-type=module -e "
    import { generateSync } from '$ROOT/artifacts/api-server/node_modules/otplib/dist/index.js';
    process.stdout.write(generateSync({ strategy: 'totp', secret: '$1' }));
  "
}

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1', ''))"; }

NICK="mfa$RANDOM$RANDOM"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"email\":\"$NICK@example.com\",\"password\":\"$PASS\"}"
TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | json token)
[ -n "$TOKEN" ] && pass "ro'yxatdan o'tdi va kirdi" || fail "login bo'lmadi"

echo
echo "=== Boshlang'ich holat: 2FA o'chiq ==="
check "$(curl -s $API/auth/2fa/status -H "Authorization: Bearer $TOKEN" | json enabled)" "False" "2FA o'chiq"

echo
echo "=== Setup: maxfiy kalit va otpauth URI ==="
R=$(curl -s -X POST $API/auth/2fa/setup -H "Authorization: Bearer $TOKEN")
SECRET=$(echo "$R" | json secret)
URI=$(echo "$R" | json otpauthUri)
[ -n "$SECRET" ] && pass "maxfiy kalit berildi (${SECRET:0:8}...)" || fail "maxfiy kalit yo'q: $R"
echo "$URI" | grep -q "^otpauth://totp/" && pass "otpauth URI to'g'ri formatda" || fail "URI noto'g'ri: $URI"
echo "$URI" | grep -q "cdCTF" && pass "URI'da issuer bor" || fail "issuer yo'q"

echo
echo "=== Kalit bazada SHIFRLANGAN saqlanadimi ==="
STORED=$(psql "$DATABASE_URL" -tAqc "SELECT totp_secret FROM users WHERE nickname='$NICK';")
echo "$STORED" | grep -q "^v1:" && pass "shifrlangan (v1: prefiksi bilan)" || fail "shifrlanmagan: $STORED"
[ "$STORED" != "$SECRET" ] && pass "bazadagi qiymat ochiq kalitga TENG EMAS" || fail "ochiq saqlangan!"

echo
echo "=== Setup hali yoqmaydi: 2FA o'chiq turishi kerak ==="
check "$(curl -s $API/auth/2fa/status -H "Authorization: Bearer $TOKEN" | json enabled)" "False" "tasdiqlanmaguncha o'chiq"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}")" "200" "login hali 2FA so'ramaydi"

echo
echo "=== Noto'g'ri kod bilan yoqib bo'lmaydi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/enable -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"code":"000000"}')" "400" "noto'g'ri kod rad etildi"

echo
echo "=== To'g'ri kod bilan yoqish → backup kodlar ==="
CODE=$(totp "$SECRET")
R=$(curl -s -X POST $API/auth/2fa/enable -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d "{\"code\":\"$CODE\"}")
NCODES=$(echo "$R" | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("backupCodes",[])))')
check "$NCODES" "10" "10 ta backup kod berildi"
BACKUP1=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["backupCodes"][0])')
BACKUP2=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["backupCodes"][1])')
echo "$BACKUP1" | grep -qE '^[A-Z2-9]{5}-[A-Z2-9]{5}$' && pass "kod formati to'g'ri ($BACKUP1)" || fail "format noto'g'ri: $BACKUP1"
check "$(curl -s $API/auth/2fa/status -H "Authorization: Bearer $TOKEN" | json enabled)" "True" "2FA yoqildi"

echo
echo "=== Backup kodlar bazada HASHLANGAN ==="
STORED_BC=$(psql "$DATABASE_URL" -tAqc "SELECT code_hash FROM user_backup_codes WHERE user_id=(SELECT id FROM users WHERE nickname='$NICK') LIMIT 1;")
[ ${#STORED_BC} -eq 64 ] && pass "sha256 hash saqlangan (64 belgi)" || fail "hash emas: $STORED_BC"
CLEAR=$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM user_backup_codes WHERE code_hash LIKE '%-%';")
check "$CLEAR" "0" "hech qaysi kod ochiq saqlanmagan"

echo
echo "=== ⭐ Endi login 2FA SO'RAYDI (sessiya bermaydi) ==="
R=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}")
check "$(echo "$R" | json requires2fa)" "True" "requires2fa=true"
MFA=$(echo "$R" | json mfaToken)
[ -n "$MFA" ] && pass "mfaToken berildi" || fail "mfaToken yo'q"
check "$(echo "$R" | json token)" "" "sessiya tokeni BERILMADI"

echo
echo "=== ⭐ mfaToken sessiya tokeni sifatida ISHLAMASLIGI kerak ==="
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $MFA")" "401" "mfaToken /auth/me da rad etildi"

echo
echo "=== Noto'g'ri kod bilan 2FA o'tmaydi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA\",\"code\":\"000000\"}")" "401" "noto'g'ri kod rad etildi"

echo
echo "=== To'g'ri TOTP kod bilan sessiya olish ==="
# /2fa/enable consumed the current time step, and the replay guard rejects any
# step at or before the last accepted one. A real user's next login is minutes
# later; here we have to wait the window out deliberately.
echo "  (yangi 30s oynani kutmoqda — replay himoyasi tufayli)"
sleep 31
CODE=$(totp "$SECRET")
R=$(curl -s -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA\",\"code\":\"$CODE\"}")
T2=$(echo "$R" | json token)
[ -n "$T2" ] && pass "sessiya tokeni berildi" || fail "token yo'q: $R"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/me -H "Authorization: Bearer $T2")" "200" "yangi token ishlaydi"

echo
echo "=== ⭐ REPLAY: xuddi shu kodni QAYTA ishlatib bo'lmaydi ==="
MFA2=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | json mfaToken)
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA2\",\"code\":\"$CODE\"}")" "401" "ishlatilgan kod REPLAY qilinmadi"

echo
echo "=== Backup kod bilan kirish ==="
MFA3=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | json mfaToken)
T3=$(curl -s -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA3\",\"code\":\"$BACKUP1\"}" | json token)
[ -n "$T3" ] && pass "backup kod bilan kirildi" || fail "backup kod ishlamadi"
check "$(curl -s $API/auth/2fa/status -H "Authorization: Bearer $T3" | json backupCodesRemaining)" "9" "qolgan kodlar 10 → 9"

echo
echo "=== ⭐ Backup kod BIR MARTALIK ==="
MFA4=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | json mfaToken)
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA4\",\"code\":\"$BACKUP1\"}")" "401" "ishlatilgan backup kod QAYTA ishlamadi"

echo
echo "=== Kod formati erkin kiritilishi mumkin (kichik harf, chiziqchasiz) ==="
MFA5=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | json mfaToken)
SLOPPY=$(echo "$BACKUP2" | tr 'A-Z' 'a-z' | tr -d '-')
T5=$(curl -s -X POST $API/auth/2fa/verify -H 'Content-Type: application/json' \
  -d "{\"mfaToken\":\"$MFA5\",\"code\":\"$SLOPPY\"}" | json token)
[ -n "$T5" ] && pass "'$SLOPPY' qabul qilindi" || fail "erkin format ishlamadi"

echo
echo "=== O'chirish: parol + kod talab qilinadi ==="
CODE=$(totp "$SECRET")
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/disable -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T5" -d "{\"password\":\"NotTheP4ss!\",\"code\":\"$CODE\"}")" "400" "noto'g'ri parol bilan o'chirilmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/disable -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T5" -d "{\"password\":\"$PASS\",\"code\":\"000000\"}")" "400" "noto'g'ri kod bilan o'chirilmadi"

# A fresh step: the code above was consumed by the replay guard on an earlier verify.
sleep 31
CODE=$(totp "$SECRET")
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/2fa/disable -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $T5" -d "{\"password\":\"$PASS\",\"code\":\"$CODE\"}")" "200" "to'g'ri parol + kod bilan o'chirildi"
check "$(curl -s $API/auth/2fa/status -H "Authorization: Bearer $T5" | json enabled)" "False" "2FA o'chdi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM user_backup_codes WHERE user_id=(SELECT id FROM users WHERE nickname='$NICK');")" "0" "backup kodlar tozalandi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT coalesce(totp_secret,'NULL') FROM users WHERE nickname='$NICK';")" "NULL" "maxfiy kalit o'chirildi"

echo
echo "=== O'chgach login yana 2FA so'ramaydi ==="
check "$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" | json requires2fa)" "" "requires2fa yo'q"

echo
[ -z "$FAILED" ] && echo "🎉 2FA TO'LIQ ISHLAYAPTI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
