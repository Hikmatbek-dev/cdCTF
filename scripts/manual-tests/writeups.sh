#!/bin/bash
# Writeups are gated to solvers on both read and write — never a spoiler.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }

TAG="wu$RANDOM"
mkuser() {
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@e.com\",\"password\":\"$PASS\"}"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])'
}

TA=$(mkuser solver); AID=$(q "SELECT id FROM users WHERE nickname='${TAG}_solver'")
TB=$(mkuser other);  BID=$(q "SELECT id FROM users WHERE nickname='${TAG}_other'")
CID=$(q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_c','d','Web','easy',100,'f',true) RETURNING id")
# A has solved it; B has not.
q "INSERT INTO ctf_attempts (user_id,ctf_id,solved,solved_at) VALUES ($AID,$CID,true,now())" > /dev/null

wu_get()  { curl -s -o /dev/null -w '%{http_code}' $API/ctf/$CID/writeups -H "Authorization: Bearer $1"; }
wu_post() { curl -s -o /dev/null -w '%{http_code}' -X POST $API/ctf/$CID/writeups -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "{\"content\":\"$2\"}"; }

LONG="Men avval nmap bilan portlarni skanerladim va SQL injection topdim, keyin flagni oldim."

echo "=== ⭐ Yechmagan foydalanuvchi KO'RA OLMAYDI (spoiler himoyasi) ==="
check "$(wu_get $TB)" "403" "yechmagan GET rad etildi"
check "$(wu_post $TB "$LONG")" "403" "yechmagan POST rad etildi"

echo
echo "=== Yechgan foydalanuvchi yozadi ==="
check "$(wu_post $TA 'qisqa')" "400" "juda qisqa matn rad etildi"
check "$(wu_post $TA "$LONG")" "201" "yechim joylandi"
check "$(curl -s $API/ctf/$CID/writeups -H "Authorization: Bearer $TA" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["writeups"]))')" "1" "GET 1 ta yechim qaytardi"
check "$(q "SELECT count(*) FROM ctf_writeups WHERE ctf_id=$CID")" "1" "bazada 1 ta"

echo
echo "=== Takror POST — tahrirlaydi, ikkinchi yozmaydi ==="
check "$(wu_post $TA "$LONG va qo'shimcha izoh: privesc uchun sudo -l ishlatdim.")" "200" "takror POST tahrir (200)"
check "$(q "SELECT count(*) FROM ctf_writeups WHERE ctf_id=$CID AND user_id=$AID")" "1" "hali ham 1 ta (dublikat yo'q)"

echo
echo "=== Boshqa yechuvchi o'qiydi, lekin begonanikini o'chira olmaydi ==="
q "INSERT INTO ctf_attempts (user_id,ctf_id,solved,solved_at) VALUES ($BID,$CID,true,now())" > /dev/null
check "$(wu_get $TB)" "200" "endi B yechgach o'qiy oladi"
WID=$(q "SELECT id FROM ctf_writeups WHERE ctf_id=$CID AND user_id=$AID")
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/ctf/$CID/writeups/$WID -H "Authorization: Bearer $TB")" "403" "begona o'chira olmaydi"

echo
echo "=== Muallif o'zinikini o'chiradi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/ctf/$CID/writeups/$WID -H "Authorization: Bearer $TA")" "200" "muallif o'chirdi"
check "$(q "SELECT count(*) FROM ctf_writeups WHERE id=$WID")" "0" "bazadan o'chdi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 WRITEUP DARVOZALARI USHLAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
