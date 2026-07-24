#!/bin/bash
# Job board and employer accounts: who may post, and what the public sees.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }

TAG="job$RANDOM"
mkuser() {
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@e.com\",\"password\":\"$PASS\"}"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])'
}

EMP=$(mkuser emp)
OUTSIDER=$(mkuser other)

echo "=== Ish beruvchi bo'lmasdan e'lon joylab bo'lmaydi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/jobs -H "Authorization: Bearer $EMP" \
  -H 'Content-Type: application/json' -d '{"title":"SOC Analyst","description":"Join us"}')" "403" "ish beruvchi emas — rad etildi"

echo
echo "=== Ish beruvchi sifatida ro'yxatdan o'tish ==="
BE=$(curl -s -X POST $API/jobs/become-employer -H "Authorization: Bearer $EMP" \
  -H 'Content-Type: application/json' -d '{"companyName":"Acme Security","companyUrl":"https://acme.example"}')
check "$(echo "$BE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("isEmployer"))')" "True" "isEmployer=true bo'ldi"
check "$(echo "$BE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("companyName"))')" "Acme Security" "kompaniya nomi saqlandi"
# Company name is required.
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/jobs/become-employer -H "Authorization: Bearer $OUTSIDER" \
  -H 'Content-Type: application/json' -d '{}')" "400" "kompaniya nomisiz rad etildi"

echo
echo "=== E'lon joylash ==="
JOB=$(curl -s -X POST $API/jobs -H "Authorization: Bearer $EMP" -H 'Content-Type: application/json' \
  -d '{"title":"SOC Analyst","description":"Monitor and respond","location":"Tashkent","employmentType":"internship","applyUrl":"https://acme.example/apply"}')
JOBID=$(echo "$JOB" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
check "$(echo "$JOB" | python3 -c 'import sys,json;print(json.load(sys.stdin)["company"])')" "Acme Security" "kompaniya profildan olindi"
check "$(echo "$JOB" | python3 -c 'import sys,json;print(json.load(sys.stdin)["employmentType"])')" "internship" "ish turi saqlandi"
# A bad apply URL is rejected.
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/jobs -H "Authorization: Bearer $EMP" \
  -H 'Content-Type: application/json' -d '{"title":"X","description":"Y","applyUrl":"javascript:alert(1)"}')" "400" "noto'g'ri ariza havolasi rad etildi"

echo
echo "=== Ochiq taxta (autentifikatsiyasiz) faol e'lonlarni ko'rsatadi ==="
check "$(curl -s $API/jobs | python3 -c 'import sys,json;print(any(j["id"]=='"$JOBID"' for j in json.load(sys.stdin)))')" "True" "e'lon ochiq ro'yxatda"

echo
echo "=== Faqat egasi tahrirlaydi/o'chiradi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/jobs/$JOBID -H "Authorization: Bearer $OUTSIDER" \
  -H 'Content-Type: application/json' -d '{"title":"Hacked"}')" "403" "begona tahrirlay olmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/jobs/$JOBID -H "Authorization: Bearer $OUTSIDER")" "403" "begona o'chira olmaydi"

echo
echo "=== Egasi e'lonni yashiradi (deaktivatsiya) ==="
curl -s -o /dev/null -X PATCH $API/jobs/$JOBID -H "Authorization: Bearer $EMP" \
  -H 'Content-Type: application/json' -d '{"isActive":false}'
check "$(curl -s $API/jobs | python3 -c 'import sys,json;print(any(j["id"]=='"$JOBID"' for j in json.load(sys.stdin)))')" "False" "yashirilgan e'lon ochiq taxtada yo'q"
check "$(curl -s $API/jobs/mine -H "Authorization: Bearer $EMP" | python3 -c 'import sys,json;print(any(j["id"]=='"$JOBID"' for j in json.load(sys.stdin)))')" "True" "lekin egasining ro'yxatida bor"
# A hidden job's detail is 404 for outsiders.
check "$(curl -s -o /dev/null -w '%{http_code}' $API/jobs/$JOBID)" "404" "yashirilgan e'lon begonaga 404"

echo
echo "=== Egasi e'lonni o'chiradi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/jobs/$JOBID -H "Authorization: Bearer $EMP")" "200" "egasi o'chirdi"
check "$(q "SELECT count(*) FROM jobs WHERE id=$JOBID")" "0" "bazadan o'chdi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 ISH TAXTASI VA ISH BERUVCHI HISOBLARI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
