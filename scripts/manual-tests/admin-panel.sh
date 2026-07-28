#!/bin/bash
# The admin panel's write paths, and the four ways they were broken.
#
# An audit found the panel could not do things whose endpoints already existed,
# and did one thing that silently destroyed data:
#
#   1. Editing a challenge was rejected unless the admin retyped the flag. PUT
#      used the create body, whose `required` list includes `flag`, while the
#      form says "leave empty to keep the current one". The stored flag is a
#      sha256 hash and cannot be read back, so the only way through was to
#      invent a new flag and silently break the challenge for everyone.
#   2. Editing a lesson deleted its Uzbek and Russian questions. Updating
#      replaces the whole question set, and the re-insert wrote three columns
#      where the create handler thirty lines above writes six. Trilingual
#      platform; green "Lesson updated!" toast.
#   3. Nothing could be published. Both publish endpoints existed with no
#      caller, and the lessons list did not even return `isPublished`, so an
#      author's draft was invisible with no way to make it live.
#   4. Roles could not be assigned. The endpoint validates, refuses
#      self-demotion, revokes sessions and writes an audit log — and the page
#      rendered the role as a static badge.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="adm$RANDOM"

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
AID=$(q "SELECT id FROM users WHERE nickname='${TAG}_root'")
[ -n "$ADMIN" ] && pass "admin tayyor" || fail "admin login bo'lmadi"

CAT=$(q "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id")

echo
echo "=== ⭐ 1. Topshiriqni flagsiz tahrirlash ishlaydi ==="
CID=$(q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published)
         VALUES ('${TAG}_ctf','Eski tavsif','Web','easy',100,'sha256\$originalhash',true) RETURNING id")
BEFORE=$(q "SELECT flag FROM ctf_tasks WHERE id=$CID")
# Exactly the body the admin form sends when the flag field is left blank.
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/ctf/$CID \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d '{"name":"Yangi nom","description":"Yangi tavsif","category":"Web","difficulty":"medium","points":150}')" \
  "200" "flagsiz PUT qabul qilinadi"
check "$(q "SELECT name FROM ctf_tasks WHERE id=$CID")" "Yangi nom" "nom yangilandi"
check "$(q "SELECT points FROM ctf_tasks WHERE id=$CID")" "150" "ball yangilandi"
check "$(q "SELECT flag FROM ctf_tasks WHERE id=$CID")" "$BEFORE" "flag saqlanib qoldi"

echo "--- flag yuborilsa almashadi (va xeshlanadi) ---"
curl -s -o /dev/null -X PUT $API/admin/ctf/$CID -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN" -d '{"flag":"flag{yangi}"}'
NEW=$(q "SELECT flag FROM ctf_tasks WHERE id=$CID")
[ "$NEW" != "$BEFORE" ] && pass "flag almashdi" || fail "flag almashmadi"
case "$NEW" in sha256\$*) pass "yangi flag xeshlangan";; *) fail "flag ochiq matnda saqlandi: $NEW";; esac

echo
echo "=== ⭐ 2. Darsni tahrirlash uz/ru savollarni o'chirmaydi ==="
LID=$(q "INSERT INTO lessons (title,content,category_id,order_index,points,is_published)
         VALUES ('${TAG}_lesson','Matn',$CAT,0,50,true) RETURNING id")
q "INSERT INTO lesson_questions (lesson_id,question,question_uz,question_ru,options,options_uz,options_ru,correct_option,order_index)
   VALUES ($LID,'EN','UZ savol','RU savol','[\"a\",\"b\"]'::jsonb,'[\"a-uz\",\"b-uz\"]'::jsonb,'[\"a-ru\",\"b-ru\"]'::jsonb,0,0)" > /dev/null

# Read it back the way the admin form does, then send it straight back.
BODY=$(curl -s $API/admin/lessons/$LID -H "Authorization: Bearer $ADMIN" | python3 -c '
import sys, json
d = json.load(sys.stdin)
qs = [{"question": q["question"], "questionUz": q.get("questionUz"), "questionRu": q.get("questionRu"),
       "options": q["options"], "optionsUz": q.get("optionsUz"), "optionsRu": q.get("optionsRu"),
       "correctOption": q["correctOption"]} for q in d["questions"]]
print(json.dumps({"title": "Tahrirlangan", "content": d["content"], "categoryId": d["categoryId"], "questions": qs}))')
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/lessons/$LID \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d "$BODY")" "200" "dars yangilandi"
check "$(q "SELECT coalesce(question_uz,'YO_Q') FROM lesson_questions WHERE lesson_id=$LID")" "UZ savol" "o'zbekcha savol saqlandi"
check "$(q "SELECT coalesce(question_ru,'YO_Q') FROM lesson_questions WHERE lesson_id=$LID")" "RU savol" "ruscha savol saqlandi"
check "$(q "SELECT coalesce(options_uz::text,'YO_Q') FROM lesson_questions WHERE lesson_id=$LID")" '["a-uz", "b-uz"]' "o'zbekcha variantlar saqlandi"

echo
echo "=== ⭐ 3. Nashr qilish ishlaydi va ro'yxatda ko'rinadi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/lessons/$LID/publish \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d '{"isPublished":false}')" "200" "darsni yashirish"
check "$(q "SELECT is_published FROM lessons WHERE id=$LID")" "f" "bazada yashirilgan"
check "$(curl -s $API/admin/lessons -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
ls=[l for l in json.load(sys.stdin)['lessons'] if l['id']==$LID]
print('YO_Q' if not ls else ('isPublished' in ls[0]))")" "True" "ro'yxat isPublished qaytaradi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/ctf/$CID/publish \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d '{"isPublished":false}')" "200" "topshiriqni yashirish"
check "$(q "SELECT is_published FROM ctf_tasks WHERE id=$CID")" "f" "topshiriq yashirildi"
echo "--- yashirilgani ommaviy ro'yxatda yo'q ---"
check "$(curl -s "$API/ctf?limit=200" | python3 -c "
import sys,json
raw=json.load(sys.stdin)
items=raw if isinstance(raw,list) else raw.get('challenges',[])
print(any(c.get('id')==$CID for c in items))")" "False" "o'quvchi yashirilgan topshiriqni ko'rmaydi"

echo
echo "=== ⭐ 4. Rol berish ishlaydi ==="
TARGET=$(mkuser target)
TID=$(q "SELECT id FROM users WHERE nickname='${TAG}_target'")
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/admin/users/$TID/role \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d '{"role":"author"}')" "200" "muallif roli berildi"
check "$(q "SELECT role FROM users WHERE id=$TID")" "author" "bazada author"
echo "--- admin o'zini pasaytira olmaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/admin/users/$AID/role \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" -d '{"role":"user"}')" "400" "o'zini pasaytirish rad etiladi"
echo "--- rol o'zgarishi audit jurnaliga tushadi ---"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='user.role_change' AND target_id='$TID'")" "1" "audit yozuvi bor"

echo
echo "=== Muallif nashr qila olmaydi (u faqat qoralama yozadi) ==="
AUTHOR=$(mkuser author author)
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/ctf/$CID/publish \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $AUTHOR" -d '{"isPublished":true}')" "403" "muallifga nashr yopiq"

echo
echo "=== ⭐ 5. Yopiq musobaqaning kodi o'qib bo'ladi ==="
# A private competition is created with a generated join code. It was returned
# once, into an onSuccess that read nothing from it, and no endpoint ever
# returned it again — so the event was listed, was private, and was unjoinable.
COMP=$(curl -s -X POST $API/admin/competitions -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"name\":\"${TAG}_comp\",\"type\":\"private\",\"startTime\":\"2030-01-01T10:00:00Z\",\"endTime\":\"2030-01-02T10:00:00Z\",\"ctfIds\":[$CID]}")
COMP_ID=$(echo "$COMP" | json id)
[ -n "$COMP_ID" ] && pass "musobaqa yaratildi" || fail "musobaqa yaratilmadi: $COMP"

DB_CODE=$(q "SELECT coalesce(invite_code,'YO_Q') FROM competitions WHERE id=$COMP_ID")
API_CODE=$(curl -s $API/admin/competitions -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json
cs=[c for c in json.load(sys.stdin)['competitions'] if c['id']==$COMP_ID]
print(cs[0].get('inviteCode') or 'YO_Q' if cs else 'TOPILMADI')")
check "$API_CODE" "$DB_CODE" "admin ro'yxati qo'shilish kodini qaytaradi"
echo "--- ommaviy ro'yxat kodni oshkor qilmaydi ---"
check "$(curl -s $API/competitions | python3 -c "
import sys,json
print(any('inviteCode' in c for c in json.load(sys.stdin)))")" "False" "ommaviy ro'yxatda kod yo'q"

echo "--- musobaqani tahrirlash: topshiriqlar to'plami ham o'zgaradi ---"
CID2=$(q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published)
          VALUES ('${TAG}_ctf2','T','Web','easy',50,'sha256\$h2',true) RETURNING id")
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/competitions/$COMP_ID \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"prize\":\"5 000 000 so'm\",\"ctfIds\":[$CID2]}")" "200" "faqat sovrin+topshiriq bilan PUT"
check "$(q "SELECT prize FROM competitions WHERE id=$COMP_ID")" "5 000 000 so'm" "sovrin saqlandi"
check "$(q "SELECT ctf_id FROM competition_tasks WHERE competition_id=$COMP_ID")" "$CID2" "topshiriqlar to'plami almashdi"
check "$(q "SELECT name FROM competitions WHERE id=$COMP_ID")" "${TAG}_comp" "nom tegilmadi"

echo "--- musobaqani o'chirish (bog'liq yozuvlari bilan) ---"
q "INSERT INTO competition_users (competition_id,user_id) VALUES ($COMP_ID,$TID)" > /dev/null
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/admin/competitions/$COMP_ID \
  -H "Authorization: Bearer $ADMIN")" "200" "musobaqa o'chirildi"
check "$(q "SELECT count(*) FROM competitions WHERE id=$COMP_ID")" "0" "bazadan ketdi"
check "$(q "SELECT count(*) FROM competition_users WHERE competition_id=$COMP_ID")" "0" "qatnashchilar ham ketdi"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='competition.delete' AND target_id='$COMP_ID'")" "1" "audit yozuvi bor"

echo
echo "=== ⭐ 6. Uch tilli maslahat saqlanadi, flag xeshi oshkor bo'lmaydi ==="
NEWC=$(curl -s -X POST $API/admin/ctf -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"name\":\"${TAG}_hint\",\"description\":\"D\",\"category\":\"Web\",\"difficulty\":\"easy\",\"points\":100,\"flag\":\"flag{h}\",\"hint\":\"EN hint\",\"hintUz\":\"UZ maslahat\",\"hintRu\":\"RU подсказка\",\"hintCost\":25}")
NEWC_ID=$(echo "$NEWC" | json id)
check "$(q "SELECT coalesce(hint_uz,'YO_Q') FROM ctf_tasks WHERE id=$NEWC_ID")" "UZ maslahat" "o'zbekcha maslahat saqlandi"
check "$(q "SELECT coalesce(hint_ru,'YO_Q') FROM ctf_tasks WHERE id=$NEWC_ID")" "RU подсказка" "ruscha maslahat saqlandi"
check "$(q "SELECT hint_cost FROM ctf_tasks WHERE id=$NEWC_ID")" "25" "maslahat narxi qabul qilindi"
echo "--- admin o'qishida flag xeshi yo'q ---"
check "$(curl -s $API/admin/ctf/$NEWC_ID -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print('flag' in json.load(sys.stdin))")" "False" "bitta topshiriqda flag yo'q"
check "$(curl -s $API/admin/ctf -H "Authorization: Bearer $ADMIN" | python3 -c "
import sys,json; print(any('flag' in c for c in json.load(sys.stdin)['challenges']))")" "False" "ro'yxatda ham flag yo'q"

echo
echo "=== ⭐ 6b. Musobaqa sanasini tahrirlash ishlaydi ==="
# `format: date-time` becomes zod.coerce.date(), so validateBody hands the
# handler a Date. parseTimestamp only accepted string and number, so every
# attempt to move a competition answered 400 "Invalid start time" — the dates
# were the one thing this endpoint could not edit.
COMP2=$(curl -s -X POST $API/admin/competitions -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d "{\"name\":\"${TAG}_dates\",\"type\":\"public\",\"startTime\":\"2030-03-01T09:00:00Z\",\"endTime\":\"2030-03-02T09:00:00Z\",\"ctfIds\":[$CID2]}" | json id)
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/competitions/$COMP2 \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d '{"startTime":"2030-04-01T09:00:00Z","endTime":"2030-04-05T09:00:00Z"}')" "200" "sanani o'zgartirish qabul qilinadi"
check "$(q "SELECT to_char(start_time AT TIME ZONE 'UTC','YYYY-MM-DD') FROM competitions WHERE id=$COMP2")" "2030-04-01" "yangi sana saqlandi"
echo "--- tugash boshlanishdan oldin bo'lolmaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/competitions/$COMP2 \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d '{"endTime":"2030-03-01T09:00:00Z"}')" "400" "teskari oraliq rad etiladi"
check "$(q "SELECT to_char(end_time AT TIME ZONE 'UTC','YYYY-MM-DD') FROM competitions WHERE id=$COMP2")" "2030-04-05" "eski tugash saqlanib qoldi"

echo
echo "=== ⭐ 6c. Faylsiz topshiriqni tahrirlash ishlaydi ==="
# The admin form sends `fileUrl: data.fileUrl || null`. fileUrl was nullable on
# create but not on update, so editing any challenge with no file attached
# answered 400 "fileUrl: Expected string, received null".
check "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/admin/ctf/$NEWC_ID \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN" \
  -d '{"name":"Faylsiz","fileUrl":null,"hint":null}')" "200" "fileUrl:null qabul qilinadi"
check "$(q "SELECT name FROM ctf_tasks WHERE id=$NEWC_ID")" "Faylsiz" "nom yangilandi"
check "$(q "SELECT coalesce(hint,'BO_SH') FROM ctf_tasks WHERE id=$NEWC_ID")" "BO_SH" "maslahat tozalandi"

echo
echo "=== ⭐ 7. O'chirishlar audit jurnaliga tushadi ==="
VICTIM=$(mkuser victim)
VID=$(q "SELECT id FROM users WHERE nickname='${TAG}_victim'")
check "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/users/$VID -H "Authorization: Bearer $ADMIN")" "200" "admin hisobni o'chirdi"
check "$(q "SELECT count(*) FROM audit_logs WHERE action='user.delete' AND target_id='$VID'")" "1" "user.delete yozildi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 ADMIN PANEL YOZUV YO'LLARI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
