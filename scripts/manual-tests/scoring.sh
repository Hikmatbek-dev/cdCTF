#!/bin/bash
# Scoring: who earns points, and that recalculation agrees with itself.
#
# The case that matters is the last one. Recalculation existed twice, and the
# copy inside DELETE /admin/ctf/:id had lost the rule that excluded accounts
# score zero — so deleting a challenge handed every admin a non-zero score.
# Both paths now call the same function; this asserts they still agree.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

mkuser() { # $1 = role
  local n="sc$1$RANDOM$RANDOM"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  [ "$1" != "user" ] && psql "$DATABASE_URL" -q -c "UPDATE users SET role='$1' WHERE nickname='$n';"
  echo "$n"
}
tokenOf() {
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$1\",\"password\":\"$PASS\"}" | json token
}
pointsOf() { psql "$DATABASE_URL" -tAqc "SELECT points FROM users WHERE nickname='$1';"; }

echo "=== Seed: 3 ta Web CTF (title chegarasi = 3) ==="
ADMIN=$(mkuser admin); A_TOK=$(tokenOf "$ADMIN")
psql "$DATABASE_URL" -q -c "INSERT INTO titles (name, category, points) VALUES ('Web Hacker','Web',500) ON CONFLICT (category) DO NOTHING;"
# A unique name per run: other suites also create category='Web' challenges in
# this shared database, and selecting by category picked up theirs.
TAG="sc$RANDOM"
CTF_IDS=""
for i in 1 2 3; do
  ID=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, is_published) VALUES ('${TAG}_W$i','d','Web','easy',100,'sha256\$$(printf 'Flag{w%s}' $i | sha256sum | cut -d' ' -f1)', true) RETURNING id;")
  CTF_IDS="$CTF_IDS $ID"
done
CTF_IDS=$(echo $CTF_IDS)
echo "  CTF id'lar: $CTF_IDS"

echo
echo "=== Oddiy foydalanuvchi ball oladi ==="
U=$(mkuser user); U_TOK=$(tokenOf "$U")
ID1=$(echo $CTF_IDS | cut -d' ' -f1)
R=$(curl -s -X POST $API/ctf/$ID1/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $U_TOK" -d '{"flag":"Flag{w1}"}')
check "$(echo "$R" | json correct)" "True" "to'g'ri flag qabul qilindi"
check "$(pointsOf "$U")" "100" "100 ball berildi"

echo
echo "=== ⭐ Title 3-yechimda beriladi (avval emas) ==="
ID2=$(echo $CTF_IDS | cut -d' ' -f2); ID3=$(echo $CTF_IDS | cut -d' ' -f3)
curl -s -o /dev/null -X POST $API/ctf/$ID2/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $U_TOK" -d '{"flag":"Flag{w2}"}'
check "$(pointsOf "$U")" "200" "2 ta yechimdan keyin 200 (title yo'q)"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM user_titles WHERE user_id=(SELECT id FROM users WHERE nickname='$U');")" "0" "hali title yo'q"

R=$(curl -s -X POST $API/ctf/$ID3/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $U_TOK" -d '{"flag":"Flag{w3}"}')
check "$(pointsOf "$U")" "800" "3-yechim: 300 + 500 title = 800"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM user_titles WHERE user_id=(SELECT id FROM users WHERE nickname='$U');")" "1" "title berildi"
# The award used to be a fire-and-forget after the commit; it is inside the
# transaction now, so the response already includes it.
check "$(echo "$R" | json pointsEarned)" "600" "javobda title balli ham bor (100+500)"

echo
echo "=== ⭐ Admin ball OLMAYDI ==="
AID=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, is_published) VALUES ('${TAG}_Admin','d','Crypto','easy',100,'sha256\$$(printf 'Flag{adm}' | sha256sum | cut -d' ' -f1)', true) RETURNING id;")
R=$(curl -s -X POST $API/ctf/$AID/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $A_TOK" -d '{"flag":"Flag{adm}"}')
check "$(echo "$R" | json correct)" "True" "admin flagni yechdi"
check "$(pointsOf "$ADMIN")" "0" "lekin ball berilmadi"

echo
echo "=== ⭐ Ruxsat berilgan admin ball OLADI + o'tgan yechimlar qo'shiladi ==="
# The admin already solved AID above while unscored (points stayed 0). A
# super-admin now opts them into scoring, and recalculation credits that PAST
# solve — the exact ask: a previously-earned solve should count once enabled.
psql "$DATABASE_URL" -q -c "UPDATE users SET admin_earns_points = true WHERE nickname='$ADMIN';"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/users/recalculate-points -H "Authorization: Bearer $A_TOK")" "200" "recalculate ishladi"
check "$(pointsOf "$ADMIN")" "100" "o'tgan yechim (100) qo'shib berildi"
# A fresh solve now pays live too.
AID2=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, is_published) VALUES ('${TAG}_Admin2','d','Crypto','easy',100,'sha256\$$(printf 'Flag{adm2}' | sha256sum | cut -d' ' -f1)', true) RETURNING id;")
R=$(curl -s -X POST $API/ctf/$AID2/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $A_TOK" -d '{"flag":"Flag{adm2}"}')
check "$(echo "$R" | json pointsEarned)" "100" "yangi yechim ham 100 ball berdi"
check "$(pointsOf "$ADMIN")" "200" "jami 200 (o'tgan + yangi)"
# Turning it back off zeroes them again — and the recalc checks below expect 0.
psql "$DATABASE_URL" -q -c "UPDATE users SET admin_earns_points = false WHERE nickname='$ADMIN';"
curl -s -o /dev/null -X POST $API/admin/users/recalculate-points -H "Authorization: Bearer $A_TOK"
check "$(pointsOf "$ADMIN")" "0" "o'chirilganda yana 0 bo'ldi"

echo
echo "=== ⭐ excludedFromScoring bayrog'i ishlaydi (nickname emas) ==="
X=$(mkuser user); X_TOK=$(tokenOf "$X")
psql "$DATABASE_URL" -q -c "UPDATE users SET excluded_from_scoring = true WHERE nickname='$X';"
curl -s -o /dev/null -X POST $API/ctf/$ID1/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $X_TOK" -d '{"flag":"Flag{w1}"}'
check "$(pointsOf "$X")" "0" "bayroq qo'yilgan hisob ball olmadi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT solved FROM ctf_attempts WHERE user_id=(SELECT id FROM users WHERE nickname='$X');")" "t" "lekin yechim qayd etildi"

echo
echo "=== Qayta hisoblash o'sha natijani beradi ==="
BEFORE=$(pointsOf "$U")
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/users/recalculate-points -H "Authorization: Bearer $A_TOK")" "200" "recalculate ishladi"
check "$(pointsOf "$U")" "$BEFORE" "oddiy foydalanuvchi bali o'zgarmadi ($BEFORE)"
check "$(pointsOf "$ADMIN")" "0" "admin hamon 0"
check "$(pointsOf "$X")" "0" "bayroqli hisob hamon 0"

echo
echo "=== ⭐⭐ CTF O'CHIRILGANDA: admin bali 0 qolishi kerak (eski bug) ==="
# The old duplicate here omitted the exclusion rule, so this is exactly the case
# that used to hand admins a score.
psql "$DATABASE_URL" -q -c "UPDATE users SET points = 999 WHERE nickname='$ADMIN';"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/admin/ctf/$AID -H "Authorization: Bearer $A_TOK")" "200" "CTF o'chirildi"
check "$(pointsOf "$ADMIN")" "0" "admin bali 0 GA QAYTDI (dublikat bug qaytmadi)"

echo
echo "=== CTF o'chirilgach yechuvchilar bali qayta hisoblandi ==="
psql "$DATABASE_URL" -q -c "UPDATE users SET points = 12345 WHERE nickname='$U';"
DEL=$(echo $CTF_IDS | cut -d' ' -f3)
curl -s -o /dev/null -X DELETE $API/admin/ctf/$DEL -H "Authorization: Bearer $A_TOK"
# 3rd Web solve is gone: 2 solves = 200, and the title no longer qualifies.
check "$(pointsOf "$U")" "200" "qo'lda buzilgan ball to'g'rilandi (200)"
check "$(psql "$DATABASE_URL" -tAqc "SELECT count(*) FROM user_titles WHERE user_id=(SELECT id FROM users WHERE nickname='$U');")" "0" "title olib qo'yildi (endi 2 ta yechim)"

echo
echo "=== ⭐ MASLAHAT (hint) — ball evaziga ochiladi va qaytarilmaydi ==="
# The schema carried hint/hint_cost/hint_used from the start but nothing ever
# exposed them: no endpoint, no UI. Hints existed and no learner could read one.
HU=$(mkuser user); HU_TOK=$(tokenOf "$HU")
HCTF=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name, description, category, difficulty, points, hint, hint_cost, flag, is_published) VALUES ('${TAG}_hint','d','Crypto','easy',100,'Base64 dekodlang',30,'sha256\$$(printf 'Flag{hint}' | sha256sum | cut -d' ' -f1)', true) RETURNING id;")
# Earn points first so there is something to spend.
curl -s -o /dev/null -X POST $API/ctf/$HCTF/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $HU_TOK" -d '{"flag":"Flag{hint}"}'
check "$(pointsOf "$HU")" "100" "yechim uchun 100 ball"
# Reveal the hint: costs 30.
HR=$(curl -s -X POST $API/ctf/$HCTF/hint -H "Authorization: Bearer $HU_TOK")
check "$(echo "$HR" | json hint)" "Base64 dekodlang" "maslahat matni qaytdi"
check "$(echo "$HR" | json pointsSpent)" "30" "30 ball yechildi"
check "$(pointsOf "$HU")" "70" "ball 100 → 70"
# Second reveal is free — no double charge.
check "$(curl -s -X POST $API/ctf/$HCTF/hint -H "Authorization: Bearer $HU_TOK" | json pointsSpent)" "0" "ikkinchi marta bepul"
check "$(pointsOf "$HU")" "70" "ball o'zgarmadi"
# ⭐ The charge must survive a recalculation, or an admin repair silently refunds it.
curl -s -o /dev/null -X POST $API/admin/users/recalculate-points -H "Authorization: Bearer $A_TOK"
check "$(pointsOf "$HU")" "70" "qayta hisoblashdan keyin ham 70 (maslahat qaytarilmadi)"
# The hint text must not leak to someone who has not paid.
HU2=$(mkuser user); HU2_TOK=$(tokenOf "$HU2")
check "$(curl -s $API/ctf/$HCTF -H "Authorization: Bearer $HU2_TOK" | json hint)" "None" "to'lamagan foydalanuvchiga matn ko'rinmaydi"
check "$(curl -s $API/ctf/$HCTF -H "Authorization: Bearer $HU2_TOK" | json hasHint)" "True" "lekin maslahat borligi bilinadi"

echo
echo "=== ⭐ Flag 'wrapper' registriga bardoshli, kontent aniq ==="
# Stored as Flag{CaseA}. Submitting flag{CaseA} / FLAG{CaseA} must be accepted
# (keyword case forgiven), but Flag{casea} must NOT (content case matters).
FC1=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_fc1','d','Web','easy',100,'sha256\$$(printf 'Flag{CaseA}' | sha256sum | cut -d' ' -f1)',true) RETURNING id")
FCU=$(mkuser user); FCU_TOK=$(tokenOf "$FCU")
check "$(curl -s -X POST $API/ctf/$FC1/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $FCU_TOK" -d '{"flag":"flag{CaseA}"}' | json correct)" "True" "kichik 'flag{...}' qabul qilindi"
FC2=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_fc2','d','Web','easy',100,'sha256\$$(printf 'Flag{CaseB}' | sha256sum | cut -d' ' -f1)',true) RETURNING id")
FCU2=$(mkuser user); FCU2_TOK=$(tokenOf "$FCU2")
check "$(curl -s -X POST $API/ctf/$FC2/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $FCU2_TOK" -d '{"flag":"Flag{caseb}"}' | json correct)" "False" "kontent registri o'zgarsa rad etildi"

echo
echo "=== ⭐ Sovg'a (gift) achko qo'shadi va qayta hisoblashda saqlanadi ==="
# The recipient is created directly, so this stays independent of the auth rate
# limiter that a long suite would otherwise trip on one more register.
GN="scgift$RANDOM$RANDOM"
GID=$(psql "$DATABASE_URL" -tAqc "INSERT INTO users (nickname,email,password_hash,email_verified) VALUES ('$GN','$GN@e.com','x',true) RETURNING id")
psql "$DATABASE_URL" -q -c "INSERT INTO gifts (user_id, category, points) VALUES ($GID, 'bug', 40)"
curl -s -o /dev/null -X POST $API/admin/users/recalculate-points -H "Authorization: Bearer $A_TOK"
check "$(pointsOf "$GN")" "40" "sovg'a 40 achko qo'shildi"
# A second gift stacks, and both survive the next recalculation.
psql "$DATABASE_URL" -q -c "INSERT INTO gifts (user_id, category, points) VALUES ($GID, 'suggestion', 40)"
curl -s -o /dev/null -X POST $API/admin/users/recalculate-points -H "Authorization: Bearer $A_TOK"
check "$(pointsOf "$GN")" "80" "ikkinchi sovg'a bilan 80 (qayta hisoblashda saqlandi)"

echo
[ -z "$FAILED" ] && echo "🎉 BALL TIZIMI IZCHIL" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
