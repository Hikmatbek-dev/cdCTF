#!/bin/bash
# Permission matrix for the four roles. Every case asserts both directions:
# what a role may do, and what it must not.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

# Makes a user and returns "token id"
mkuser() { # $1 = role
  local n="r$1$RANDOM$RANDOM"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  psql "$DATABASE_URL" -q -c "UPDATE users SET role='$1' WHERE nickname='$n';"
  local tok id
  tok=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
  id=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE nickname='$n';")
  echo "$tok $id"
}

code() { # $1=method $2=path $3=token [$4=body]
  if [ -n "$4" ]; then
    curl -s -o /dev/null -w '%{http_code}' -X "$1" "$API$2" -H "Authorization: Bearer $3" \
      -H 'Content-Type: application/json' -d "$4"
  else
    curl -s -o /dev/null -w '%{http_code}' -X "$1" "$API$2" -H "Authorization: Bearer $3"
  fi
}

read -r T_USER  ID_USER  <<< "$(mkuser user)"
read -r T_AUTH  ID_AUTH  <<< "$(mkuser author)"
read -r T_MOD   ID_MOD   <<< "$(mkuser moderator)"
read -r T_ADMIN ID_ADMIN <<< "$(mkuser admin)"
echo "Foydalanuvchilar: user=$ID_USER author=$ID_AUTH moderator=$ID_MOD admin=$ID_ADMIN"

CTF_BODY='{"name":"T","description":"d","category":"Web","difficulty":"easy","points":100,"flag":"Flag{x}"}'

echo
echo "=== 'user' roli admin panelining hech joyiga kira olmaydi ==="
check "$(code GET /admin/dashboard "$T_USER")"   "403" "user → /admin/dashboard 403"
check "$(code GET /admin/users "$T_USER")"       "403" "user → /admin/users 403"
check "$(code GET /admin/audit-logs "$T_USER")"  "403" "user → /admin/audit-logs 403"
check "$(code POST /admin/ctf "$T_USER" "$CTF_BODY")" "403" "user → CTF yarata olmaydi"

echo
echo "=== 'author': kontent yozadi, boshqa hech nima ==="
check "$(code GET /admin/dashboard "$T_AUTH")"   "200" "author → panelga kiradi"
check "$(code GET /admin/ctf "$T_AUTH")"         "200" "author → CTF ro'yxatini ko'radi"
check "$(code POST /admin/users/$ID_USER/block "$T_AUTH")" "403" "author → foydalanuvchi BLOKLAY OLMAYDI"
check "$(code GET /admin/audit-logs "$T_AUTH")"  "403" "author → audit log KO'RA OLMAYDI"
check "$(code GET /admin/users "$T_AUTH")"       "403" "author → foydalanuvchilar ro'yxatini KO'RA OLMAYDI"
check "$(code POST /admin/competitions "$T_AUTH" '{"name":"x","startTime":"2030-01-01","endTime":"2030-01-02"}')" "403" "author → musobaqa YARATA OLMAYDI"

echo
echo "=== 'moderator': moderatsiya qiladi, kontent yozmaydi ==="
check "$(code GET /admin/users "$T_MOD")"        "200" "moderator → foydalanuvchilarni ko'radi"
check "$(code GET /admin/audit-logs "$T_MOD")"   "200" "moderator → audit log ko'radi"
check "$(code POST /admin/users/$ID_USER/block "$T_MOD")" "200" "moderator → bloklay oladi"
check "$(code POST /admin/users/$ID_USER/unblock "$T_MOD")" "200" "moderator → blokni ocha oladi"
check "$(code POST /admin/ctf "$T_MOD" "$CTF_BODY")" "403" "moderator → CTF YARATA OLMAYDI"
check "$(code DELETE /admin/ctf/1 "$T_MOD")"     "403" "moderator → CTF O'CHIRA OLMAYDI"
check "$(code PATCH /admin/users/$ID_USER/role "$T_MOD" '{"role":"admin"}')" "403" "moderator → rol BERA OLMAYDI"

echo
echo "=== 'author' CTF yaratadi → QORALAMA bo'lishi kerak ==="
R=$(curl -s -X POST $API/admin/ctf -H "Authorization: Bearer $T_AUTH" -H 'Content-Type: application/json' -d "$CTF_BODY")
CTF_ID=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
PUB=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["isPublished"])')
AID=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["authorId"])')
check "$PUB" "False" "author yaratgan CTF qoralama (isPublished=false)"
check "$AID" "$ID_AUTH" "authorId to'g'ri yozildi"

echo "=== Qoralama ommaviy ro'yxatda KO'RINMASLIGI kerak ==="
# A fresh reader: the moderator cases above blocked $T_USER, which revokes its
# sessions, so reusing that token here would 401 for the wrong reason.
read -r T_READER _ <<< "$(mkuser user)"
N=$(curl -s "$API/ctf" | python3 -c 'import sys,json; d=json.load(sys.stdin); c=d["challenges"] if isinstance(d,dict) else d; print(sum(1 for x in c if x["id"]=='"$CTF_ID"'))')
check "$N" "0" "qoralama ommaviy ro'yxatda yo'q"
check "$(code GET /ctf/$CTF_ID "$T_READER")" "404" "qoralamani to'g'ridan-to'g'ri ochib bo'lmaydi"
check "$(code POST /ctf/$CTF_ID/submit "$T_READER" '{"flag":"Flag{x}"}')" "404" "qoralamaga flag topshirib bo'lmaydi"

echo
echo "=== 'author' o'z CTF'ini tahrirlaydi, birovnikini yo'q ==="
check "$(code PATCH /admin/ctf/$CTF_ID "$T_AUTH" '{"name":"Yangi nom"}')" "200" "author o'z CTF'ini tahrirladi"
R2=$(curl -s -X POST $API/admin/ctf -H "Authorization: Bearer $T_ADMIN" -H 'Content-Type: application/json' -d "$CTF_BODY")
ADMIN_CTF=$(echo "$R2" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
check "$(code PATCH /admin/ctf/$ADMIN_CTF "$T_AUTH" '{"name":"O_g_irlash"}')" "403" "author BIROVNIKINI tahrirlay olmadi"

echo
echo "=== 'author' ball va publish holatini o'zi o'zgartira olmaydi (ustun allowlist) ==="
curl -s -o /dev/null -X PATCH $API/admin/ctf/$CTF_ID -H "Authorization: Bearer $T_AUTH" \
  -H 'Content-Type: application/json' -d '{"name":"n","points":99999,"isPublished":true}'
PTS=$(psql "$DATABASE_URL" -tAqc "SELECT points FROM ctf_tasks WHERE id=$CTF_ID;")
PUB2=$(psql "$DATABASE_URL" -tAqc "SELECT is_published FROM ctf_tasks WHERE id=$CTF_ID;")
check "$PTS" "100" "author ballni o'zgartira OLMADI (100 qoldi)"
check "$PUB2" "f" "author o'zini publish qila OLMADI"
check "$(code POST /admin/ctf/$CTF_ID/publish "$T_AUTH" '{}')" "403" "author publish endpoint'iga kira olmaydi"

echo
echo "=== 'admin' publish qiladi → ommaviy ro'yxatda paydo bo'ladi ==="
check "$(code POST /admin/ctf/$CTF_ID/publish "$T_ADMIN" '{"isPublished":true}')" "200" "admin publish qildi"
N=$(curl -s "$API/ctf" | python3 -c 'import sys,json; d=json.load(sys.stdin); c=d["challenges"] if isinstance(d,dict) else d; print(sum(1 for x in c if x["id"]=='"$CTF_ID"'))')
check "$N" "1" "publish'dan keyin ommaviy ro'yxatda paydo bo'ldi"

echo
echo "=== Rol o'zgarishi darhol kuchga kiradi va sessiyani bekor qiladi ==="
check "$(code GET /admin/users "$T_AUTH")" "403" "author hozir /admin/users ko'ra olmaydi"
check "$(code PATCH /admin/users/$ID_AUTH/role "$T_ADMIN" '{"role":"moderator"}')" "200" "admin rolni moderator qildi"
check "$(code GET /admin/users "$T_AUTH")" "401" "eski token BEKOR qilindi (rol o'zgardi)"

echo
echo "=== Admin o'zini pasaytira olmaydi ==="
check "$(code PATCH /admin/users/$ID_ADMIN/role "$T_ADMIN" '{"role":"user"}')" "400" "admin o'zini pasaytira olmadi"
check "$(code PATCH /admin/users/$ID_USER/role "$T_ADMIN" '{"role":"qirol"}')" "400" "noma'lum rol rad etildi"

echo
[ -z "$FAILED" ] && echo "🎉 RUXSAT MATRITSASI TO'LIQ O'TDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
