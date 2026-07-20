#!/bin/bash
# Modules, the final exam, and the certificate it issues.
#
# The certificate is the valuable artifact here — it carries a person's real
# name and a score, and people will show it to employers. So every gate in
# front of it is tested from the attacker's side, not just the happy path:
#
#   - the exam does not open until every lesson in the module is finished
#   - answers are collapsed to one per question, or sending every option for
#     every question scores 100% (the exact bug the lesson test once had)
#   - the client is never sent correctOption
#   - below pass_score there is no certificate, whatever the client asks for
#   - the printed name must look like a name
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="mod$RANDOM"

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

# A module with two lessons and a five-question exam.
CAT=$(q "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id")
MID=$(q "INSERT INTO modules (slug, title, description, category_id, pass_score, estimated_hours)
         VALUES ('${TAG}-slug','${TAG} Module','desc',$CAT,80,12) RETURNING id")
L1=$(q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points) VALUES ('${TAG}_L1','c',$CAT,$MID,0,50) RETURNING id")
L2=$(q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points) VALUES ('${TAG}_L2','c',$CAT,$MID,1,50) RETURNING id")
for L in $L1 $L2; do
  q "INSERT INTO lesson_questions (lesson_id, question, options, correct_option, order_index)
     VALUES ($L,'q','[\"a\",\"b\"]'::jsonb,0,0)" > /dev/null
done
for i in 0 1 2 3 4; do
  q "INSERT INTO module_questions (module_id, question, options, correct_option, order_index)
     VALUES ($MID,'eq$i','[\"a\",\"b\",\"c\",\"d\"]'::jsonb,$((i % 4)),$i)" > /dev/null
done

echo "=== Modul ro'yxatda ko'rinadi va darslar sanaladi ==="
LC=$(curl -s $API/learn/modules -H "Authorization: Bearer $TOK" | python3 -c "
import sys,json; d=json.load(sys.stdin)
m=[x for x in d if x['id']==$MID]
print(m[0]['lessonCount'] if m else 'topilmadi')")
check "$LC" "2" "modulда 2 ta dars"

echo
echo "=== ⭐ Darslar tugamaguncha imtihon OCHILMAYDI (serverда tekshiriladi) ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/modules/$MID/exam/start -H "Authorization: Bearer $TOK")" "403" "0/2 darsда imtihon rad etildi"

# Finish both lessons honestly.
for L in $L1 $L2; do
  SID=$(curl -s -X POST $API/learn/lessons/$L/test/start -H "Authorization: Bearer $TOK" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("sessionId",""))')
  ANS=$(q "SELECT json_agg(json_build_object('questionId',id,'selectedOption',correct_option)) FROM lesson_questions WHERE lesson_id=$L")
  curl -s -o /dev/null -X POST $API/learn/lessons/$L/test/submit -H "Authorization: Bearer $TOK" \
    -H 'Content-Type: application/json' -d "{\"sessionId\":\"$SID\",\"answers\":$ANS}"
done
check "$(q "SELECT count(*) FROM user_lesson_attempts WHERE user_id=$UID_ AND completed_at IS NOT NULL")" "2" "ikkala dars tugatildi"

echo
echo "=== Endi imtihon ochiladi ==="
START=$(curl -s -X POST $API/learn/modules/$MID/exam/start -H "Authorization: Bearer $TOK")
ESID=$(echo "$START" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("sessionId",""))')
[ -n "$ESID" ] && pass "imtihon boshlandi" || fail "imtihon boshlanmadi: $START"

echo
echo "=== ⭐ Javoblar klientga OSHKOR QILINMAYDI ==="
# Sentinels deliberately carry no apostrophe. They used to be "bor"/"yo'q", and
# the Python literal ended up with U+02BC while the comparison used ASCII — the
# check failed on a character nobody can see, on a test that had actually passed.
LEAK=$(echo "$START" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("BOR" if any("correctOption" in q for q in d.get("questions",[])) else "YOQ")')
check "$LEAK" "YOQ" "correctOption yuborilmadi"

echo
echo "=== ⭐ Takroriy javob RAD ETILADI (har variantni yuborib 100% olish yo'li) ==="
QIDS=$(q "SELECT string_agg(id::text,',') FROM module_questions WHERE module_id=$MID")
FIRST=$(echo "$QIDS" | cut -d, -f1)
DUP="[{\"questionId\":$FIRST,\"selectedOption\":0},{\"questionId\":$FIRST,\"selectedOption\":1}]"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/modules/$MID/exam/submit -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "{\"sessionId\":\"$ESID\",\"answers\":$DUP}")" "400" "bir savolga ikki javob rad etildi"

echo
echo "=== 80% dan past → sertifikat YO'Q ==="
ESID=$(curl -s -X POST $API/learn/modules/$MID/exam/start -H "Authorization: Bearer $TOK" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sessionId"])')
# Two of five right = 40%.
WEAK=$(q "SELECT json_agg(json_build_object('questionId',id,'selectedOption', CASE WHEN order_index < 2 THEN correct_option ELSE (correct_option+1)%4 END)) FROM module_questions WHERE module_id=$MID")
RES=$(curl -s -X POST $API/learn/modules/$MID/exam/submit -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "{\"sessionId\":\"$ESID\",\"answers\":$WEAK}")
check "$(echo "$RES" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("score"))')" "40" "ball 40% hisoblandi"
check "$(echo "$RES" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("passed"))')" "False" "o'tmagan deb belgilandi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/modules/$MID/certificate -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}')" "403" "o'tmasdan sertifikat berilmadi"
check "$(q "SELECT count(*) FROM certificates WHERE user_id=$UID_")" "0" "bazada sertifikat yo'q"

echo
echo "=== ⭐ 100% → o'tdi, sertifikat mumkin ==="
ESID=$(curl -s -X POST $API/learn/modules/$MID/exam/start -H "Authorization: Bearer $TOK" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sessionId"])')
GOOD=$(q "SELECT json_agg(json_build_object('questionId',id,'selectedOption',correct_option)) FROM module_questions WHERE module_id=$MID")
RES=$(curl -s -X POST $API/learn/modules/$MID/exam/submit -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "{\"sessionId\":\"$ESID\",\"answers\":$GOOD}")
check "$(echo "$RES" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("score"))')" "100" "ball 100%"
check "$(echo "$RES" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("passed"))')" "True" "o'tdi"

echo
echo "=== Ism tekshiruvi (sertifikatga chop etiladi) ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/modules/$MID/certificate -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"x"}')" "400" "juda qisqa ism rad etildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/learn/modules/$MID/certificate -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"h4ck3r_777"}')" "400" "taxallusга o'xshash ism rad etildi"

echo
echo "=== Sertifikat beriladi va ism/ball saqlanadi ==="
CERT=$(curl -s -X POST $API/learn/modules/$MID/certificate -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}')
SERIAL=$(echo "$CERT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("serial",""))')
echo "  seriya: $SERIAL"
check "$(echo "$CERT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("score"))')" "100" "sertifikatда 100 ball"
check "$(q "SELECT full_name FROM certificates WHERE user_id=$UID_ AND module_id=$MID")" "Aziz Karimov" "ism bazaga yozildi"

echo
echo "=== Ikki marta so'rasa yangi sertifikat yasalmaydi ==="
curl -s -o /dev/null -X POST $API/learn/modules/$MID/certificate -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d '{"fullName":"Aziz Karimov"}'
check "$(q "SELECT count(*) FROM certificates WHERE user_id=$UID_ AND module_id=$MID")" "1" "bitta sertifikat qoldi"

echo
echo "=== Ommaviy tekshirish (ishga oluvchi ko'rsatganда) ==="
VER=$(curl -s $API/learn/certificates/$SERIAL)
check "$(echo "$VER" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("fullName"))')" "Aziz Karimov" "seriya bo'yicha topildi"
LEAK2=$(echo "$VER" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("BOR" if "userId" in d or "email" in d else "YOQ")')
check "$LEAK2" "YOQ" "shaxsiy ma'lumot oshkor qilinmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/learn/certificates/CDCTF-0000000000)" "404" "mavjud bo'lmagan seriya 404"

echo
[ -z "${FAILED:-}" ] && echo "🎉 MODUL, IMTIHON VA SERTIFIKAT DARVOZALARI USHLAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
