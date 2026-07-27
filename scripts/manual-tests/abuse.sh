#!/bin/bash
# The exploit paths an audit found open, each one closed and each one proved shut.
#
# Every check here failed before the fix. They are grouped by what an attacker
# was actually able to do:
#
#   1. Forge a certificate. The module exam counted attempts and read the count
#      back nowhere, and submitting returns how many answers were right — so
#      unlimited retakes turned it into an answer oracle, and the credential at
#      the end is real and publicly verifiable.
#   2. Replay a lesson test. The session id survived the submit (the exam
#      cleared its own), so one /start bought unlimited /submit — with the same
#      per-question oracle, and the three-attempt cap never reached.
#   3. Escalate with a leaked API token. PATCH /users/:id read the role straight
#      off the token; an admin's token carries role "admin", and the admin
#      column set includes `role` itself.
#   4. Read every hint for free. The charge was min(points, cost), so zero
#      points meant a free hint.
#   5. Lose data by asking to be deleted. Thirteen tables reference users(id);
#      four were cleared, then the delete raised a foreign-key violation — after
#      the first four had already been committed.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="abu$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }
code() { python3 -c "import sys; print(sys.stdin.read().strip())"; }

mkuser() { # $1 = nickname suffix -> session token
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | json token
}

TOK=$(mkuser u)
UID_=$(q "SELECT id FROM users WHERE nickname='${TAG}_u'")
[ -n "$TOK" ] && pass "foydalanuvchi tayyor" || fail "login bo'lmadi"

# A module with two lessons and an exam, and this learner has finished both
# lessons — the state from which the exam is reachable.
CAT=$(q "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id")
MID=$(q "INSERT INTO modules (slug, title, description, category_id, pass_score, estimated_hours, is_published)
         VALUES ('${TAG}-slug','${TAG} Modul','d',$CAT,80,10,true) RETURNING id")
L1=$(q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points, is_published) VALUES ('${TAG}_L1','c',$CAT,$MID,0,50,true) RETURNING id")
L2=$(q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points, is_published) VALUES ('${TAG}_L2','c',$CAT,$MID,1,50,true) RETURNING id")
for L in $L1 $L2; do
  q "INSERT INTO user_lesson_attempts (user_id,lesson_id,status,completed_at) VALUES ($UID_,$L,'completed',now())" > /dev/null
done
for i in 0 1 2 3 4; do
  q "INSERT INTO module_questions (module_id, question, options, correct_option, order_index)
     VALUES ($MID,'q$i','[\"a\",\"b\",\"c\",\"d\"]'::jsonb,$((i % 4)),$i)" > /dev/null
done

start_exam() { curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/modules/$MID/exam/start -H "Authorization: Bearer $TOK"; }

echo
echo "=== ⭐ 1. Imtihon: oynadagi urinishlar cheklangan ==="
for i in 1 2 3 4 5; do
  c=$(start_exam)
  [ "$c" = "200" ] || fail "$i-urinish rad etildi ($c) — chegara juda tor"
done
pass "5 ta urinish o'tdi"
check "$(start_exam)" "429" "6-urinish rad etiladi (orakul hujumi ~60 ta talab qiladi)"
check "$(curl -s -X POST $API/learn/modules/$MID/exam/start -H "Authorization: Bearer $TOK" | python3 -c 'import sys,json;print("retryAt" in json.load(sys.stdin))')" "True" "javob qachon qayta urinishni aytadi"

echo "--- oyna eskirsa yana ochiladi (abadiy blok emas) ---"
q "UPDATE module_exam_attempts SET window_started_at = now() - interval '25 hours' WHERE user_id=$UID_ AND module_id=$MID" > /dev/null
check "$(start_exam)" "200" "24 soatdan keyin qayta ochiladi"

echo
echo "=== ⭐ 2. Dars testi: sessiya bir martalik ==="
LT=$(q "INSERT INTO lessons (title, content, category_id, order_index, points, is_published) VALUES ('${TAG}_T','c',$CAT,0,50,true) RETURNING id")
QID=$(q "INSERT INTO lesson_questions (lesson_id, question, options, correct_option, order_index)
         VALUES ($LT,'q','[\"a\",\"b\"]'::jsonb,0,0) RETURNING id")
SID=$(curl -s -X POST $API/learn/lessons/$LT/test/start -H "Authorization: Bearer $TOK" | json sessionId)
[ -n "$SID" ] && pass "sessiya boshlandi" || fail "sessiya olinmadi"

submit() { # $1 = selectedOption -> http code
  curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/lessons/$LT/test/submit \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" \
    -d "{\"sessionId\":\"$SID\",\"answers\":[{\"questionId\":$QID,\"selectedOption\":$1}]}"
}
check "$(submit 1)" "200" "birinchi yuborish qabul qilinadi (noto'g'ri javob)"
check "$(submit 0)" "400" "o'sha sessiya bilan ikkinchi yuborish rad etiladi"
check "$(q "SELECT test_session_id IS NULL FROM user_lesson_attempts WHERE user_id=$UID_ AND lesson_id=$LT")" "t" "sessiya bazada bekor qilingan"
check "$(q "SELECT completed_at IS NULL FROM user_lesson_attempts WHERE user_id=$UID_ AND lesson_id=$LT")" "t" "dars tugatilgan deb belgilanmadi"

echo
echo "=== ⭐ 3. API token profilni o'zgartira olmaydi ==="
APITOK=$(curl -s -X POST $API/auth/api-tokens -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOK" -d '{"name":"ci","scopes":["ctf:read"]}' | json token)
[ -n "$APITOK" ] && pass "token yaratildi" || fail "token yaratilmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/users/$UID_ \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $APITOK" -d '{"nickname":"newname123"}')" "403" "PATCH /users/:id token bilan 403"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/users/$UID_ -H "Authorization: Bearer $APITOK")" "403" "DELETE /users/:id token bilan 403"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/users/$UID_/avatar -H "Authorization: Bearer $APITOK")" "403" "avatar yuklash token bilan 403"
echo "--- sessiya esa ishlaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/users/$UID_ \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"nickname":"'${TAG}'ok"}')" "200" "sessiya bilan PATCH ishlaydi"

echo
echo "=== ⭐ 4. Maslahat bepul emas ==="
HC=$(q "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, hint, hint_cost, is_published)
        VALUES ('${TAG}_hint','d','Web','easy',100,'sha256\$deadbeef','Bu maslahat',30,true) RETURNING id")
q "UPDATE users SET points=0 WHERE id=$UID_" > /dev/null
R=$(curl -s -w '\n%{http_code}' -X POST $API/ctf/$HC/hint -H "Authorization: Bearer $TOK")
check "$(echo "$R" | tail -1)" "402" "0 ballda maslahat berilmaydi"
echo "$R" | head -1 | grep -q "Bu maslahat" && fail "maslahat matni baribir qaytdi!" || pass "maslahat matni oshkor bo'lmadi"
check "$(q "SELECT count(*) FROM ctf_attempts WHERE user_id=$UID_ AND ctf_id=$HC AND hint_used")" "0" "hint_used belgilanmadi"

echo "--- ball yetarli bo'lsa to'liq narx yechiladi ---"
q "UPDATE users SET points=100 WHERE id=$UID_" > /dev/null
check "$(curl -s -X POST $API/ctf/$HC/hint -H "Authorization: Bearer $TOK" | json pointsSpent)" "30" "to'liq narx (30) yechildi"
check "$(q "SELECT points FROM users WHERE id=$UID_")" "70" "ball 100 → 70"
echo "--- ikkinchi marta qayta hisoblanmaydi ---"
check "$(curl -s -X POST $API/ctf/$HC/hint -H "Authorization: Bearer $TOK" | json pointsSpent)" "0" "takror so'rovda qayta to'lanmaydi"
check "$(q "SELECT points FROM users WHERE id=$UID_")" "70" "ball o'zgarmadi"

echo
echo "=== ⭐ 5. Hisobni o'chirish chet el kalitiga urilmaydi ==="
DTOK=$(mkuser del)
DID=$(q "SELECT id FROM users WHERE nickname='${TAG}_del'")
# Exactly the rows that used to make the delete throw — after the first four
# tables had already been emptied.
q "INSERT INTO module_exam_attempts (user_id, module_id, attempt_count, best_score, passed) VALUES ($DID,$MID,1,90,true)" > /dev/null
q "INSERT INTO certificates (serial, user_id, module_id, full_name, score) VALUES ('CDCTF-${TAG}DEL',$DID,$MID,'Test Nomi',90)" > /dev/null
q "INSERT INTO ctf_writeups (ctf_id, user_id, content) VALUES ($HC,$DID,'Bu yerda yechim tushuntirilgan matn turadi.')" > /dev/null
COMP=$(q "INSERT INTO competitions (name, type, start_time, end_time) VALUES ('${TAG}_c','public', now() - interval '2 hours', now() + interval '2 hours') RETURNING id")
TEAM=$(q "INSERT INTO competition_teams (competition_id, name, invite_code, captain_id) VALUES ($COMP,'${TAG}_team','${TAG}CODE',$DID) RETURNING id")
q "INSERT INTO competition_users (competition_id, user_id, team_id) VALUES ($COMP,$DID,$TEAM)" > /dev/null
q "INSERT INTO competition_solves (competition_id, user_id, ctf_id, points_earned) VALUES ($COMP,$DID,$HC,100)" > /dev/null
q "INSERT INTO user_lesson_attempts (user_id,lesson_id,status,completed_at) VALUES ($DID,$L1,'completed',now())" > /dev/null
q "INSERT INTO audit_logs (actor_user_id, action, target_type) VALUES ($DID,'${TAG}_action','user')" > /dev/null

check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/users/$DID -H "Authorization: Bearer $DTOK")" "200" "o'chirish muvaffaqiyatli"
check "$(q "SELECT count(*) FROM users WHERE id=$DID")" "0" "foydalanuvchi haqiqatan o'chdi"
check "$(q "SELECT count(*) FROM certificates WHERE user_id=$DID")" "0" "sertifikat ham o'chdi"
check "$(q "SELECT count(*) FROM ctf_writeups WHERE user_id=$DID")" "0" "writeup o'chdi"
check "$(q "SELECT count(*) FROM competition_solves WHERE user_id=$DID")" "0" "musobaqa yechimlari o'chdi"
check "$(q "SELECT count(*) FROM competition_teams WHERE id=$TEAM")" "0" "yolg'iz a'zoli jamoa tarqatildi"
echo "--- audit izi saqlanadi, lekin ismini aytmaydi ---"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='${TAG}_action'")" "1" "audit yozuvi qoldi"
check "$(q "SELECT actor_user_id IS NULL FROM audit_logs WHERE action='${TAG}_action'")" "t" "actor bo'shatildi"

echo "--- jamoada boshqa a'zo bo'lsa, kapitanlik o'tadi ---"
DTOK2=$(mkuser del2); DID2=$(q "SELECT id FROM users WHERE nickname='${TAG}_del2'")
HEIR=$(mkuser heir); HID2=$(q "SELECT id FROM users WHERE nickname='${TAG}_heir'")
TEAM2=$(q "INSERT INTO competition_teams (competition_id, name, invite_code, captain_id) VALUES ($COMP,'${TAG}_t2','${TAG}CODE2',$DID2) RETURNING id")
q "INSERT INTO competition_users (competition_id, user_id, team_id) VALUES ($COMP,$DID2,$TEAM2),($COMP,$HID2,$TEAM2)" > /dev/null
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/users/$DID2 -H "Authorization: Bearer $DTOK2")" "200" "kapitan o'chirildi"
check "$(q "SELECT captain_id FROM competition_teams WHERE id=$TEAM2")" "$HID2" "kapitanlik qolgan a'zoga o'tdi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 SUIISTE'MOL YO'LLARI YOPIQ" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
