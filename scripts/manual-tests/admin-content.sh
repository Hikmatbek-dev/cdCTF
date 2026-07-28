#!/bin/bash
# The parts of the platform the admin panel had no route to at all, plus the
# pagination it claimed to have.
#
#   1. `modules` and `learn_categories` were read-only from the panel. The
#      production modules exist because a seed script inserted them; adding one,
#      fixing a title, reordering the path or changing an exam pass mark meant
#      SQL against the live database. Categories are worse: the lesson form
#      requires one and the create handler rejects an id that does not exist, so
#      with no categories a lesson could not be written at all.
#   2. `ctf_writeups.is_published` is read by the public endpoint and was never
#      written by anything, so it was a moderation switch with no switch. The
#      only lever staff had was deleting the writeup.
#   3. Every admin list selected its whole table. /admin/users has advertised
#      `limit` and `offset` in the OpenAPI description for as long as it has
#      existed, and the handler ignored both — then filtered the search in
#      JavaScript, so finding one nickname read every row.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="ac$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

mkuser() { # $1 = suffix, $2 = role -> session token
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  [ -n "$2" ] && q "UPDATE users SET role='$2' WHERE nickname='$n'" > /dev/null
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | json token
}

ADMIN=$(mkuser root admin)
MOD=$(mkuser mod moderator)
AUTHOR=$(mkuser author author)
[ -n "$ADMIN" ] && pass "admin tayyor" || fail "admin login bo'lmadi"

echo
echo "=== ⭐ 1. Kategoriya yaratish mumkin (dars uchun shart) ==="
CAT=$(curl -s -X POST $API/admin/learn-categories -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d "{\"name\":\"${TAG}_kat\",\"nameUz\":\"${TAG}_uz\"}" | json id)
[ -n "$CAT" ] && pass "kategoriya yaratildi" || fail "kategoriya yaratilmadi"
check "$(q "SELECT coalesce(name_uz,'YO_Q') FROM learn_categories WHERE id=$CAT")" "${TAG}_uz" "o'zbekcha nom saqlandi"
check "$(curl -s $API/admin/learn-categories -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
cs=[c for c in json.load(sys.stdin)['categories'] if c['id']==$CAT]
print(cs[0]['lessonCount'] if cs else 'TOPILMADI')")" "0" "ro'yxatda dars soni bilan chiqadi"

echo "--- shu kategoriya bilan dars yaratish ishlaydi ---"
LID=$(curl -s -X POST $API/admin/lessons -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"title\":\"${TAG}_dars\",\"content\":\"Matn\",\"categoryId\":$CAT,\"points\":50,\"questions\":[{\"question\":\"S\",\"options\":[\"a\",\"b\"],\"correctOption\":0}]}" | json id)
[ -n "$LID" ] && pass "dars yaratildi" || fail "dars yaratilmadi"

echo "--- ishlatilayotgan kategoriyani o'chirib bo'lmaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/admin/learn-categories/$CAT \
  -H "Authorization: Bearer $ADMIN")" "409" "band kategoriya rad etiladi"
check "$(q "SELECT count(*) FROM learn_categories WHERE id=$CAT")" "1" "kategoriya joyida qoldi"

echo
echo "=== ⭐ 2. Modul yaratish, tahrirlash, nashr qilish ==="
MOD_ID=$(curl -s -X POST $API/admin/modules -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"slug\":\"${TAG}-mod\",\"title\":\"Test moduli\",\"titleUz\":\"Sinov moduli\",\"description\":\"D\",\"passScore\":75,\"estimatedHours\":20,\"orderIndex\":3}" | json id)
[ -n "$MOD_ID" ] && pass "modul yaratildi" || fail "modul yaratilmadi"
echo "--- yangi modul yashirin holatda boshlanadi ---"
check "$(q "SELECT is_published FROM modules WHERE id=$MOD_ID")" "f" "darslarsiz modul nashrga chiqmaydi"
check "$(q "SELECT pass_score FROM modules WHERE id=$MOD_ID")" "75" "o'tish bali saqlandi"
check "$(q "SELECT coalesce(title_uz,'YO_Q') FROM modules WHERE id=$MOD_ID")" "Sinov moduli" "o'zbekcha sarlavha saqlandi"

echo "--- takroriy slug rad etiladi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/modules -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d "{\"slug\":\"${TAG}-mod\",\"title\":\"Ikkinchi\",\"description\":\"D\"}")" "409" "band slug rad etiladi"

echo "--- noto'g'ri slug rad etiladi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/modules -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d '{"slug":"Katta Harf","title":"X","description":"D"}')" "400" "bo'sh joyli slug rad etiladi"

echo "--- o'tish bali 0 ga tushmaydi (aks holda sertifikat hammaga) ---"
curl -s -o /dev/null -X PATCH $API/admin/modules/$MOD_ID -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d '{"passScore":0}'
check "$(q "SELECT pass_score FROM modules WHERE id=$MOD_ID")" "1" "0 emas, eng kamida 1 ga qisiladi"

echo "--- nashr qilish va tartibni o'zgartirish ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/admin/modules/$MOD_ID -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d '{"isPublished":true,"orderIndex":7,"passScore":80}')" "200" "modul yangilandi"
check "$(q "SELECT is_published||' '||order_index||' '||pass_score FROM modules WHERE id=$MOD_ID")" "true 7 80" "nashr, tartib va bal saqlandi"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='module.update' AND target_id='$MOD_ID'")" "2" "har o'zgarish audit jurnalida"

echo "--- darsi bor modulni o'chirib bo'lmaydi ---"
q "UPDATE lessons SET module_id=$MOD_ID WHERE id=$LID" > /dev/null
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/admin/modules/$MOD_ID -H "Authorization: Bearer $ADMIN")" "409" "band modul rad etiladi"
q "UPDATE lessons SET module_id=NULL WHERE id=$LID" > /dev/null
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/admin/modules/$MOD_ID -H "Authorization: Bearer $ADMIN")" "200" "bo'sh modul o'chadi"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='module.delete' AND target_id='$MOD_ID'")" "1" "o'chirish audit jurnalida"

echo
echo "=== ⭐ 2b. Modul imtihonini tahrirlash ==="
# Fifteen questions per module decide who earns a certificate, and the only way
# to write or correct one was SQL against the live database.
MOD2=$(curl -s -X POST $API/admin/modules -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"slug\":\"${TAG}-exam\",\"title\":\"Imtihon moduli\",\"description\":\"D\",\"passScore\":80}" | json id)
check "$(curl -s $API/admin/modules/$MOD2/questions -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(len(d['questions']))")" "0" "yangi modulda savol yo'q"

EXAM='{"questions":[
  {"question":"SQL inyeksiya nima?","questionUz":"SQL inyeksiya nima?","questionRu":"Что такое SQL-инъекция?",
   "options":["Kirish maydoniga SQL qo\u0027shish","Parolni taxmin qilish","",""],
   "optionsUz":["Kirish maydoniga SQL qo\u0027shish","Parolni taxmin qilish","",""],
   "correctOption":0},
  {"question":"XSS qanday himoyalanadi?","options":["Chiqishni ekranlash","Hech narsa","Portni yopish","Loglash"],"correctOption":0}
]}'
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/modules/$MOD2/questions \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d "$EXAM")" "200" "imtihon saqlandi"
check "$(q "SELECT count(*) FROM module_questions WHERE module_id=$MOD2")" "2" "ikkita savol yozildi"
echo "--- ortidagi bo'sh variantlar kesiladi, tarjima moslashadi ---"
check "$(q "SELECT jsonb_array_length(options) FROM module_questions WHERE module_id=$MOD2 ORDER BY order_index LIMIT 1")" "2" "bo'sh variantlar olib tashlandi"
check "$(q "SELECT jsonb_array_length(options_uz) FROM module_questions WHERE module_id=$MOD2 ORDER BY order_index LIMIT 1")" "2" "o'zbekcha variantlar bir xil uzunlikda"
check "$(q "SELECT coalesce(question_ru,'YO_Q') FROM module_questions WHERE module_id=$MOD2 ORDER BY order_index LIMIT 1")" "Что такое SQL-инъекция?" "ruscha savol saqlandi"

echo "--- noto'g'ri savollar rad etiladi ---"
bad() { curl -s -X PUT $API/admin/modules/$MOD2/questions -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d "$1" | python3 -c "import sys,json; print('error' in json.load(sys.stdin))"; }
check "$(bad '{"questions":[{"question":"X","options":["a"],"correctOption":0}]}')" "True" "bitta variantli savol rad etiladi"
check "$(bad '{"questions":[{"question":"X","options":["a","b"],"correctOption":5}]}')" "True" "mavjud bo'lmagan javob rad etiladi"
check "$(bad '{"questions":[{"question":"","options":["a","b"],"correctOption":0}]}')" "True" "bo'sh savol rad etiladi"
check "$(bad '{"questions":[{"question":"X","options":["a","","c"],"correctOption":0}]}')" "True" "o'rtada bo'sh variant rad etiladi"
check "$(bad '{"questions":[]}')" "True" "bo'sh imtihon tasdiqsiz rad etiladi"
echo "--- rad etilgandan keyin eski imtihon joyida ---"
check "$(q "SELECT count(*) FROM module_questions WHERE module_id=$MOD2")" "2" "eski savollar buzilmadi"

echo "--- imtihon topshirayotgan o'quvchi bo'lsa yozish rad etiladi ---"
SITTER=$(mkuser sitter)
STID=$(q "SELECT id FROM users WHERE nickname='${TAG}_sitter'")
q "INSERT INTO module_exam_attempts (user_id,module_id,exam_session_id,exam_started_at)
   VALUES ($STID,$MOD2,'sessiya-1',now())" > /dev/null
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/modules/$MOD2/questions \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d "$EXAM")" "409" "jonli sessiya yozishni to'xtatadi"
check "$(curl -s $API/admin/modules/$MOD2/questions -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(json.load(sys.stdin)['activeSessions'])")" "1" "tahrirlagich jonli sessiyani ko'rsatadi"
echo "--- tashlab ketilgan sessiya to'sib qo'ymaydi ---"
q "UPDATE module_exam_attempts SET exam_started_at = now() - interval '5 hours' WHERE user_id=$STID" > /dev/null
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/modules/$MOD2/questions \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d "$EXAM")" "200" "eski sessiya to'smaydi"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='module.exam_update' AND target_id='$MOD2'")" "2" "har saqlash audit jurnalida"

echo "--- panelda yozilgan imtihonni o'quv tomoni ko'radi ---"
# The two halves are wired through module_questions and nothing else. If the
# admin write and the learner read ever disagree about that table, this notices.
# The learner route serves published modules by numeric id.
curl -s -o /dev/null -X PATCH $API/admin/modules/$MOD2 -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d '{"isPublished":true}'
check "$(curl -s $API/learn/modules/$MOD2 | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('examQuestionCount', 'MAYDON-YO_Q'))")" "2" "modul sahifasi ikkita savolni sanaydi"

echo "--- muallif imtihonni o'zgartira olmaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/modules/$MOD2/questions \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $AUTHOR" -d "$EXAM")" "403" "muallifga yopiq"

echo
echo "=== ⭐ 3. Writeup moderatsiyasi ==="
CID=$(q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published)
         VALUES ('${TAG}_ctf','D','Web','easy',100,'sha256\$h',true) RETURNING id")
SOLVER=$(mkuser solver)
SID=$(q "SELECT id FROM users WHERE nickname='${TAG}_solver'")
q "INSERT INTO ctf_attempts (user_id,ctf_id,solved,solved_at) VALUES ($SID,$CID,true,now())" > /dev/null
WID=$(curl -s -X POST $API/ctf/$CID/writeups -H 'Content-Type: application/json' -H "Authorization: Bearer $SOLVER" \
  -d '{"content":"Bu yerda men topshiriqni qanday yechganimni tushuntiraman."}' | json id)
[ -n "$WID" ] && pass "writeup yozildi" || fail "writeup yozilmadi"

echo "--- moderator writeuplarni yechmasdan ko'ra oladi ---"
check "$(curl -s $API/admin/writeups -H "Authorization: Bearer $MOD" | python3 -c "
import sys,json
ws=[w for w in json.load(sys.stdin)['writeups'] if w['id']==$WID]
print(ws[0]['authorNickname'] if ws else 'TOPILMADI')")" "${TAG}_solver" "moderator ro'yxatda ko'radi"

echo "--- muallif rolida yopiq ---"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/admin/writeups -H "Authorization: Bearer $AUTHOR")" "403" "muallifga yopiq"

echo "--- yashirish topshiriq sahifasidan olib tashlaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/admin/writeups/$WID -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MOD" -d '{"isPublished":false}')" "200" "yashirish qabul qilindi"
check "$(q "SELECT is_published FROM ctf_writeups WHERE id=$WID")" "f" "bazada yashirilgan"
check "$(curl -s $API/ctf/$CID/writeups -H "Authorization: Bearer $SOLVER" | python3 -c "
import sys,json; print(len(json.load(sys.stdin)['writeups']))")" "0" "yechuvchi endi ko'rmaydi"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='writeup.moderate' AND target_id='$WID'")" "1" "moderatsiya audit jurnalida"

echo "--- qaytarib ko'rsatish ---"
curl -s -o /dev/null -X PATCH $API/admin/writeups/$WID -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MOD" -d '{"isPublished":true}'
check "$(curl -s $API/ctf/$CID/writeups -H "Authorization: Bearer $SOLVER" | python3 -c "
import sys,json; print(len(json.load(sys.stdin)['writeups']))")" "1" "yana ko'rinadi"

echo
echo "=== ⭐ 4. Sahifalash haqiqatan ishlaydi ==="
# Enough rows that one page cannot hold them, without being slow about it.
for i in $(seq 1 7); do
  q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published)
     VALUES ('${TAG}_p$i','D','Web','easy',10,'sha256\$p$i',true)" > /dev/null
done
check "$(curl -s "$API/admin/ctf?limit=3&offset=0" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(len(d['challenges']))")" "3" "limit=3 uchta qaytaradi"
PAGE1=$(curl -s "$API/admin/ctf?limit=3&offset=0" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(','.join(str(c['id']) for c in json.load(sys.stdin)['challenges']))")
PAGE2=$(curl -s "$API/admin/ctf?limit=3&offset=3" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(','.join(str(c['id']) for c in json.load(sys.stdin)['challenges']))")
[ -n "$PAGE1" ] && [ "$PAGE1" != "$PAGE2" ] && pass "ikkinchi sahifa boshqa satrlar" || fail "sahifalar bir xil: '$PAGE1' / '$PAGE2'"
check "$(curl -s "$API/admin/ctf?limit=3" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d['total'] >= 8)")" "True" "total butun jadvalni sanaydi"

echo "--- tanlagich butun ro'yxatni oladi (sahifalash uni bo'g'masin) ---"
# The competition form's challenge picker is a checklist, not a browsable list.
# When /admin/ctf gained a default page size it silently truncated that choice.
check "$(curl -s "$API/admin/ctf?limit=200" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(len(d['challenges']) == min(d['total'], 200))")" "True" "limit=200 hammasini qamraydi"

echo "--- limit cheksiz emas ---"
check "$(curl -s "$API/admin/ctf?limit=99999" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(json.load(sys.stdin)['limit'])")" "200" "limit 200 ga qisiladi"

echo "--- qidiruv bazada bajariladi va sahifalanadi ---"
for i in $(seq 1 4); do
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"${TAG}_qidir$i\",\"email\":\"${TAG}_qidir$i@example.com\",\"password\":\"$PASS\"}"
done
check "$(curl -s "$API/admin/users?search=${TAG}_qidir" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(json.load(sys.stdin)['total'])")" "4" "qidiruv to'rttasini topadi"
check "$(curl -s "$API/admin/users?search=${TAG}_qidir&limit=2" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(f\"{len(d['users'])}/{d['total']}\")")" "2/4" "sahifa ikkita, jami to'rt"
check "$(curl -s "$API/admin/users?search=YO_Q_BUNDAY_ODAM" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(json.load(sys.stdin)['total'])")" "0" "topilmasa nol"

echo "--- audit jurnali 200 tadan narigisiga ham yetadi ---"
check "$(curl -s "$API/admin/audit-logs?limit=5&offset=2" -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(f\"{len(d['logs'])} {d['offset']}\")")" "5 2" "audit sahifalanadi"

echo
echo "=== ⭐ 5. Ruxsatlar chegarasi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/modules -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AUTHOR" -d '{"slug":"x-y","title":"X","description":"D"}')" "403" "muallif modul yarata olmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/learn-categories -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $MOD" -d '{"name":"X"}')" "403" "moderator kategoriya yarata olmaydi"
check "$(curl -s -o /dev/null -w '%{http_code}' $API/admin/modules -H "Authorization: Bearer $AUTHOR")" "200" "muallif modullarni o'qiy oladi"

echo "--- dars ro'yxati muallif kimligini qaytaradi (panel tahrir tugmasini shunga qarab chizadi) ---"
check "$(curl -s $API/admin/lessons -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
ls=[l for l in json.load(sys.stdin)['lessons'] if l['id']==$LID]
print('authorId' in ls[0] if ls else 'TOPILMADI')")" "True" "authorId ro'yxatda bor"

echo
[ -z "${FAILED:-}" ] && echo "🎉 O'QUV DASTURI, WRITEUP VA SAHIFALASH TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
