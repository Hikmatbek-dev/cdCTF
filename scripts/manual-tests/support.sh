#!/bin/bash
# Support / bug reports: anyone can file one, it lands in the DB and is listed in
# the admin panel, and staff move it open → resolved. Run by run-all.sh.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="sup$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

mkuser() { # $1 = suffix [$2 = role]
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  [ -n "$2" ] && q "UPDATE users SET role='$2' WHERE nickname='$n';" > /dev/null
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | json token
}

echo "=== Anonim foydalanuvchi murojaat yubordi ==="
R=$(curl -s -X POST $API/support -H 'Content-Type: application/json' \
  -d '{"message":"Login tugmasi ishlamayapti","category":"bug","pageUrl":"/login"}')
TID=$(echo "$R" | json id)
check "$(echo "$R" | json ok)" "True" "murojaat qabul qilindi"
check "$([ -n "$TID" ] && echo yes)" "yes" "ticket id qaytdi"
check "$(q "SELECT status FROM support_tickets WHERE id=$TID")" "open" "DB'da 'open' holatda"

echo
echo "=== Juda qisqa xabar rad etiladi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/support -H 'Content-Type: application/json' -d '{"message":"x"}')" "400" "5 belgidan qisqa xabar 400"

echo
echo "=== Admin panelda ko'rinadi va hal qilinadi ==="
ADM=$(mkuser adm admin)
LIST=$(curl -s "$API/admin/support?status=open" -H "Authorization: Bearer $ADM")
check "$(echo "$LIST" | python3 -c "import sys,json;d=json.load(sys.stdin);print(any(t['id']==$TID for t in d.get('tickets',[])))")" "True" "ochiq ro'yxatda bor"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/admin/support/$TID -H "Authorization: Bearer $ADM" -H 'Content-Type: application/json' -d '{"status":"resolved"}')" "200" "hal qilindi"
check "$(q "SELECT status FROM support_tickets WHERE id=$TID")" "resolved" "DB'da 'resolved' bo'ldi"
check "$(q "SELECT resolved_by IS NOT NULL FROM support_tickets WHERE id=$TID")" "t" "kim hal qilgani yozildi"

echo
echo "=== Oddiy foydalanuvchi admin ro'yxatini KO'RA OLMAYDI ==="
USR=$(mkuser usr)
check "$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/support" -H "Authorization: Bearer $USR")" "403" "oddiy user 403 oldi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 SUPPORT TIZIMI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
