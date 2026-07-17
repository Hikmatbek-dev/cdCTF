#!/bin/bash
# Fields the handlers need survive the validator.
#
# zod strips what the schema does not declare, silently. So an operation whose
# spec omits a field the handler reads does not fail — it quietly loses the
# value, and every status code stays exactly the same. That already happened
# once: captchaToken was missing from RegisterBody, and wiring the validator
# would have disabled Turnstile with nothing to show for it.
#
# Wiring the remaining 28 routes turned up three more of these by reading:
#   - SignUploadBody had no `size`, which the handler requires and 400s without
#   - CreateCompetitionBody had no `inviteCode`, so a chosen join code became random
#   - UpdateProfileBody listed only `nickname`, dropping avatarUrl and every
#     admin field — which would have disabled admin user management
#
# The spec was fixed in each case. These cases exist because the whole suite
# passed while all three were broken: nothing tested them, and a status code
# would not have told you anyway. Each asserts the STORED value, not the reply.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }

mkuser() { # $1 = role -> "token id"
  local n="bf$1$RANDOM$RANDOM"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  psql "$DATABASE_URL" -q -c "UPDATE users SET role='$1' WHERE nickname='$n';"
  local tok id
  tok=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
  id=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE nickname='$n';")
  echo "$tok $id"
}

read -r ADMIN_TOK ADMIN_ID <<< "$(mkuser admin)"
read -r USER_TOK USER_ID <<< "$(mkuser user)"

echo "=== ⭐ inviteCode saqlanadi (o'chirilsa — tasodifiy kod qo'yilardi) ==="
CODE="mycode$RANDOM"
NAME="bfcomp$RANDOM"
RC=$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/competitions -H "Authorization: Bearer $ADMIN_TOK" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$NAME\",\"type\":\"private\",\"inviteCode\":\"$CODE\",\"startTime\":\"2030-01-01T00:00:00Z\",\"endTime\":\"2030-01-02T00:00:00Z\",\"ctfIds\":[]}")
check "$RC" "201" "musobaqa yaratildi"
STORED=$(psql "$DATABASE_URL" -tAqc "SELECT invite_code FROM competitions WHERE name='$NAME'")
check "$STORED" "$CODE" "tanlangan taklif kodi bazaga yozildi"

echo
echo "=== ⭐ Admin foydalanuvchi maydonlari saqlanadi (nickname'dan boshqasi ham) ==="
curl -s -o /dev/null -X PATCH $API/users/$USER_ID -H "Authorization: Bearer $ADMIN_TOK" \
  -H 'Content-Type: application/json' -d '{"isBlocked":true,"points":42}'
check "$(psql "$DATABASE_URL" -tAqc "SELECT is_blocked FROM users WHERE id=$USER_ID")" "t" "isBlocked yozildi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT points FROM users WHERE id=$USER_ID")" "42" "points yozildi"

curl -s -o /dev/null -X PATCH $API/users/$USER_ID -H "Authorization: Bearer $ADMIN_TOK" \
  -H 'Content-Type: application/json' -d '{"isBlocked":false,"role":"author"}'
check "$(psql "$DATABASE_URL" -tAqc "SELECT role FROM users WHERE id=$USER_ID")" "author" "role yozildi"

echo
echo "=== RBAC hali ham hukmron: oddiy foydalanuvchi o'ziga rol bera olmaydi ==="
# The schema accepts `role` from anyone — deciding who MAY set it is
# filterAllowedUpdates' job, not the validator's. This is the case that proves
# widening the schema did not widen permission.
psql "$DATABASE_URL" -q -c "UPDATE users SET role='user' WHERE id=$USER_ID;"
UT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$(psql "$DATABASE_URL" -tAqc "SELECT nickname FROM users WHERE id=$USER_ID")\",\"password\":\"$PASS\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')
curl -s -o /dev/null -X PATCH $API/users/$USER_ID -H "Authorization: Bearer $UT" \
  -H 'Content-Type: application/json' -d '{"role":"admin"}'
check "$(psql "$DATABASE_URL" -tAqc "SELECT role FROM users WHERE id=$USER_ID")" "user" "o'z rolini ko'tara olmadi"

echo
echo "=== ⭐ Yuklash uchun size yetib boradi (o'chirilsa 'Invalid file size' bo'lardi) ==="
MSG=$(curl -s -X POST $API/uploads/ctf-file/sign -H "Authorization: Bearer $ADMIN_TOK" \
  -H 'Content-Type: application/json' -d '{"filename":"a.bin","contentType":"application/octet-stream","size":1024}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin).get("error", "-"))' 2>/dev/null)
echo "  → $MSG"
# Storage may be unconfigured here, which is a different failure entirely. What
# must not appear is the size complaint: that would mean the field was stripped.
echo "$MSG" | grep -qi "invalid file size" && fail "size o'chirilgan — spec uni yo'qotgan" || pass "size handler'ga yetib bordi"

echo
echo "=== ⭐ Spec serverdan QATTIQROQ emas (aks holda ishlaydigan so'rov yiqilardi) ==="
# The other direction of the same bug. CreateCompetitionBody demanded type and
# ctfIds, CreateLessonBody demanded points and questions, SignUploadBody
# demanded filename — none of which the handlers require. Wiring those would
# have started rejecting requests that had always worked.
N2="bfopt$RANDOM"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/competitions -H "Authorization: Bearer $ADMIN_TOK" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$N2\",\"startTime\":\"2030-01-01T00:00:00Z\",\"endTime\":\"2030-01-02T00:00:00Z\"}")" "201" \
  "type/ctfIds'siz musobaqa yaratildi (server ularni talab qilmaydi)"
check "$(psql "$DATABASE_URL" -tAqc "SELECT type FROM competitions WHERE name='$N2'")" "public" "type ko'rsatilmaganda public bo'ldi"

echo
echo "=== Spec chegaralari qo'llanadi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/uploads/ctf-file/sign -H "Authorization: Bearer $ADMIN_TOK" \
  -H 'Content-Type: application/json' -d '{"filename":"a.bin","size":0}')" "400" "size=0 rad etildi"
# $UT, not $USER_TOK: blocking the user above revoked every session they had —
# which is the correct behaviour, and makes the original token a 401 here.
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/users/$USER_ID -H "Authorization: Bearer $UT" \
  -H 'Content-Type: application/json' -d '{"nickname":"ab"}')" "400" "3 belgidan qisqa nickname rad etildi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 KERAKLI MAYDONLAR VALIDATORDAN OMON O'TADI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
