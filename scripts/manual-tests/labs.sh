#!/bin/bash
# Labs: the guards around starting a vulnerable machine.
#
# The container itself is started by a separate runner service, which is not
# configured in this environment — so what is tested here is everything the API
# owns: the feature flag, authentication, the one-machine-per-learner rule, and
# the ownership check on stop. The runner's own behaviour is covered by its
# allowlist and its README, not from here.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

TAG="lab$RANDOM"
mkuser() {
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@e.com\",\"password\":\"$PASS\"}"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | json token
}

U=$(mkuser a); U2=$(mkuser b)
UID_=$(q "SELECT id FROM users WHERE nickname='${TAG}_a'")
UID2_=$(q "SELECT id FROM users WHERE nickname='${TAG}_b'")

# The tables exist because ensureDatabaseShape created them — this insert would
# fail otherwise, which is itself the check.
LAB=$(q "INSERT INTO labs (slug,name,description,image,container_port,ttl_minutes)
         VALUES ('${TAG}-dvwa','DVWA','A deliberately vulnerable web app','vulnerables/web-dvwa',80,60) RETURNING id")
echo "=== Seed: lab #$LAB ==="

echo
echo "=== Katalog ochiq, ammo labs hali yoqilmagan ==="
L=$(curl -s $API/labs)
check "$(echo "$L" | python3 -c 'import sys,json;print(json.load(sys.stdin)["available"])')" "False" "runner sozlanmagan — available=false"
check "$(echo "$L" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(any(x["id"]=='"$LAB"' for x in d["labs"]))')" "True" "lab katalogda ko'rinadi"
check "$(echo "$L" | python3 -c 'import sys,json;print(json.load(sys.stdin)["running"])')" "None" "autentifikatsiyasiz ishlayotgan mashina yo'q"

echo
echo "=== ⭐ Ishga tushirish darvozalari ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/labs/$LAB/start)" "401" "tizimga kirmasdan ishga tushirib bo'lmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/labs/$LAB/start -H "Authorization: Bearer $U")" "503" "runner yo'q — 503 (yoqilmagan)"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/labs/999999/start -H "Authorization: Bearer $U")" "503" "yo'q lab ham 503 (darvoza avval ishlaydi)"
check "$(q "SELECT count(*) FROM lab_instances")" "0" "hech qanday instance yaratilmadi"

echo
echo "=== ⭐ Bitta o'quvchi — bitta mashina (baza darajasida) ==="
# The API refuses a second start, but the real guarantee is the partial unique
# index: two concurrent requests must not both create a running row.
q "INSERT INTO lab_instances (lab_id,user_id,container_id,host,port,expires_at)
   VALUES ($LAB,$UID_,'cdctf-lab-aaaaaaaaaaaa','127.0.0.1',20001, now() + interval '1 hour')" > /dev/null
SECOND=$(psql "$DATABASE_URL" -tAqc "INSERT INTO lab_instances (lab_id,user_id,container_id,host,port,expires_at)
   VALUES ($LAB,$UID_,'cdctf-lab-bbbbbbbbbbbb','127.0.0.1',20002, now() + interval '1 hour')" 2>&1 | grep -c "duplicate key")
check "$SECOND" "1" "ikkinchi ishlayotgan mashina indeks bilan rad etildi"
# A different learner is unaffected.
q "INSERT INTO lab_instances (lab_id,user_id,container_id,host,port,expires_at)
   VALUES ($LAB,$UID2_,'cdctf-lab-cccccccccccc','127.0.0.1',20003, now() + interval '1 hour')" > /dev/null
check "$(q "SELECT count(*) FROM lab_instances WHERE status='running'")" "2" "boshqa o'quvchi o'z mashinasini oldi"

echo
echo "=== Ishlayotgan mashina egasiga ko'rinadi ==="
check "$(curl -s $API/labs -H "Authorization: Bearer $U" | python3 -c 'import sys,json;r=json.load(sys.stdin)["running"];print(r["port"] if r else "yo_q")')" "20001" "o'z mashinasi portи bilan qaytdi"
check "$(curl -s $API/labs -H "Authorization: Bearer $U2" | python3 -c 'import sys,json;r=json.load(sys.stdin)["running"];print(r["port"] if r else "yo_q")')" "20003" "ikkinchi o'quvchi o'zinikini ko'radi"

echo
echo "=== ⭐ To'xtatish faqat egasiga ==="
INST=$(q "SELECT id FROM lab_instances WHERE user_id=$UID_ AND status='running'")
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/labs/instances/$INST/stop -H "Authorization: Bearer $U2")" "403" "begona to'xtata olmaydi"
check "$(q "SELECT status FROM lab_instances WHERE id=$INST")" "running" "hali ishlayapti"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/labs/instances/$INST/stop -H "Authorization: Bearer $U")" "200" "egasi to'xtatdi"
check "$(q "SELECT status FROM lab_instances WHERE id=$INST")" "stopped" "holat stopped"
# Stopping frees the slot, so the same learner may start again.
check "$(psql "$DATABASE_URL" -tAqc "INSERT INTO lab_instances (lab_id,user_id,container_id,host,port,expires_at)
   VALUES ($LAB,$UID_,'cdctf-lab-dddddddddddd','127.0.0.1',20004, now() + interval '1 hour')" 2>&1 | grep -c "duplicate key")" "0" "to'xtatgandan keyin yangisini olish mumkin"

echo
echo "=== ⭐ Muddati o'tgan mashina yig'ishtiriladi ==="
q "UPDATE lab_instances SET expires_at = now() - interval '5 minutes' WHERE user_id=$UID_ AND status='running'" > /dev/null
curl -s -o /dev/null $API/labs
check "$(q "SELECT count(*) FROM lab_instances WHERE user_id=$UID_ AND status='running'")" "0" "muddati o'tgani ro'yxatga kirishda yopildi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 LABORATORIYA DARVOZALARI USHLAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
