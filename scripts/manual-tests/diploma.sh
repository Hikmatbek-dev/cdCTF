#!/bin/bash
# The program diploma: the whole-program credential, earned by passing every
# published module.
#
# The gate is tested from the attacker's side, like the module certificate:
#
#   - the diploma is refused until every published module's exam is passed
#   - below completion there is no diploma, whatever the client asks for
#   - the printed name must look like a name
#   - a second request does not mint a second diploma
#   - public verification leaks no user id or email
#
# Passing a module's exam is set up directly here (a passed module_exam_attempts
# row) rather than by sitting six exams — this suite tests the DIPLOMA gate, and
# modules-certificates.sh already proves the exam gate that feeds it.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="dip$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }

N="${TAG}_u1"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"email\":\"$N@example.com\",\"password\":\"$PASS\"}"
TOK=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
UID_=$(q "SELECT id FROM users WHERE nickname='$N'")

# The diploma counts EVERY published module, and run-all.sh shares one database
# across suites — modules-certificates leaves a published module behind. Retire
# all existing modules so this suite's three are the only published ones and the
# counts are deterministic. Safe: the database is created and dropped by run-all.
q "UPDATE modules SET is_published = false" > /dev/null

# Three published modules, each with one lesson so it is a valid module.
CAT=$(q "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id")
MIDS=()
for i in 1 2 3; do
  MID=$(q "INSERT INTO modules (slug, title, description, category_id, pass_score, estimated_hours, order_index)
           VALUES ('${TAG}-m$i','${TAG} Module $i','desc',$CAT,80,10,$i) RETURNING id")
  q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points) VALUES ('${TAG}_L$i','c',$CAT,$MID,0,50)" > /dev/null
  MIDS+=("$MID")
done

echo "=== ⭐ Barcha modullar o'tilmaguncha diplom OCHILMAYDI ==="
STATUS=$(curl -s $API/learn/diploma -H "Authorization: Bearer $TOK")
check "$(echo "$STATUS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["available"])')" "False" "boshida diplom mavjud emas"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/diploma -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}')" "403" "0/3 modulda diplom rad etildi"

echo
echo "=== Ikki modul o'tilgan, biri qolgan → hali rad etiladi ==="
for MID in "${MIDS[@]:0:2}"; do
  q "INSERT INTO module_exam_attempts (user_id, module_id, attempt_count, best_score, passed, passed_at)
     VALUES ($UID_,$MID,1,90,true,now())" > /dev/null
done
check "$(curl -s $API/learn/diploma -H "Authorization: Bearer $TOK" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(str(d["passedModules"])+"/"+str(d["totalModules"]))')" "2/3" "2/3 modul o'tildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/diploma -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}')" "403" "2/3 da hali rad etildi"

echo
echo "=== ⭐ Uchala modul o'tilgach → diplom ochiladi ==="
q "INSERT INTO module_exam_attempts (user_id, module_id, attempt_count, best_score, passed, passed_at)
   VALUES ($UID_,${MIDS[2]},1,84,true,now())" > /dev/null
STATUS=$(curl -s $API/learn/diploma -H "Authorization: Bearer $TOK")
check "$(echo "$STATUS" | python3 -c 'import sys,json; print(json.load(sys.stdin)["available"])')" "True" "diplom endi mavjud"
# Average of 90, 90, 84 = 88.
check "$(echo "$STATUS" | python3 -c 'import sys,json; print(json.load(sys.stdin)["averageScore"])')" "88" "o'rtacha ball 88% hisoblandi"

echo
echo "=== Ism tekshiruvi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/diploma -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"x"}')" "400" "juda qisqa ism rad etildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/diploma -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"h4ck3r_777"}')" "400" "taxallusga o'xshash ism rad etildi"

echo
echo "=== Diplom beriladi va ma'lumot saqlanadi ==="
DIP=$(curl -s -X POST $API/learn/diploma -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}')
SERIAL=$(echo "$DIP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("serial",""))')
echo "  seriya: $SERIAL"
check "$(echo "$SERIAL" | grep -cE '^CDCTF-DIP-[A-F0-9]{10}$')" "1" "seriya CDCTF-DIP- formatida"
check "$(echo "$DIP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("averageScore"))')" "88" "diplomda o'rtacha 88"
check "$(echo "$DIP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("moduleCount"))')" "3" "diplomda 3 modul"
check "$(q "SELECT full_name FROM program_diplomas WHERE user_id=$UID_")" "Aziz Karimov" "ism bazaga yozildi"

echo
echo "=== Ikki marta so'rasa yangi diplom yasalmaydi ==="
curl -s -o /dev/null -X POST $API/learn/diploma -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}'
check "$(q "SELECT count(*) FROM program_diplomas WHERE user_id=$UID_")" "1" "bitta diplom qoldi"

echo
echo "=== Ommaviy tekshirish ==="
VER=$(curl -s $API/learn/diploma/$SERIAL)
check "$(echo "$VER" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("fullName"))')" "Aziz Karimov" "seriya bo'yicha topildi"
LEAK=$(echo "$VER" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("BOR" if "userId" in d or "email" in d else "YOQ")')
check "$LEAK" "YOQ" "shaxsiy ma'lumot oshkor qilinmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/learn/diploma/CDCTF-DIP-0000000000)" "404" "mavjud bo'lmagan seriya 404"

echo
[ -z "${FAILED:-}" ] && echo "🎉 DIPLOM DARVOZALARI USHLAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
