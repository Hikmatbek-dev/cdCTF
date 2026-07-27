#!/bin/bash
# GET /api/users/me/reminders — what the dashboard tells a returning learner to do next.
#
# The value of this endpoint is entirely in *when it stays quiet*. A reminder
# that fires for someone with nothing to do, or keeps firing after they have
# done it, trains people to ignore the strip — so every check below has a
# matching negative: the state is created, the reminder appears, the state is
# resolved, the reminder is gone.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="rem$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }

# Every kind currently returned, in priority order.
kinds() { curl -s $API/users/me/reminders -H "Authorization: Bearer $TOK" \
  | python3 -c 'import sys,json; print(",".join(r["kind"] for r in json.load(sys.stdin)["reminders"]))'; }
# One field out of the reminder of a given kind.
field() { curl -s $API/users/me/reminders -H "Authorization: Bearer $TOK" \
  | python3 -c "
import sys,json
rs=[r for r in json.load(sys.stdin)['reminders'] if r['kind']=='$1']
print(rs[0]['data'].get('$2','') if rs else 'YO_Q')"; }
has() { case ",$(kinds)," in *",$1,"*) echo yes;; *) echo no;; esac; }

N="${TAG}_u"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"email\":\"$N@example.com\",\"password\":\"$PASS\"}"
TOK=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
UID_=$(q "SELECT id FROM users WHERE nickname='$N'")

# Earlier suites leave live competitions in the shared throwaway database, and
# an event reminder fires for anyone who has not joined one — so "this learner
# has nothing to do" was never true here and the suite failed only when run
# after competitions.sh. Enrolling the fresh user in everything that already
# exists silences those without touching other suites' data; the events this
# suite creates below are still the only ones it can be reminded about.
q "INSERT INTO competition_users (competition_id, user_id) SELECT id, $UID_ FROM competitions" > /dev/null

echo "=== Autentifikatsiyasiz 401 ==="
check "$(curl -s -o /dev/null -w '%{http_code}' $API/users/me/reminders)" "401" "token yo'q — 401"

echo
echo "=== ⭐ Yangi foydalanuvchida hech qanday eslatma yo'q ==="
# The important negative: an empty platform state must produce silence, not a
# card. Provably able to fail — if any branch defaulted to "true", this breaks.
check "$(kinds)" "" "bo'sh ro'yxat"

echo
echo "=== ⭐ Streak xavf ostida ==="
q "UPDATE users SET current_streak=4, longest_streak=4,
     last_activity_date=to_char((now() - interval '1 day') at time zone 'UTC','YYYY-MM-DD')
   WHERE id=$UID_" > /dev/null
check "$(has streak_at_risk)" "yes" "kecha faol bo'lgan, bugun emas — ogohlantiradi"
check "$(field streak_at_risk currentStreak)" "4" "streak qiymati uzatiladi"

echo
echo "=== ⭐ Bugun faol bo'lsa jim turadi ==="
q "UPDATE users SET last_activity_date=to_char(now() at time zone 'UTC','YYYY-MM-DD') WHERE id=$UID_" > /dev/null
check "$(has streak_at_risk)" "no" "bugungi faollikdan keyin ogohlantirmaydi"

echo
echo "=== ⭐ Uzilgan uzoq streak qaytishga chaqiradi ==="
q "UPDATE users SET current_streak=0, longest_streak=7 WHERE id=$UID_" > /dev/null
check "$(has streak_lost)" "yes" "streak 0, rekord 7 — qaytarish taklifi"
check "$(field streak_lost longestStreak)" "7" "rekord uzatiladi"

echo "--- qisqa rekord esa chaqirmaydi ---"
q "UPDATE users SET longest_streak=2 WHERE id=$UID_" > /dev/null
check "$(has streak_lost)" "no" "2 kunlik rekord uchun eslatma yo'q"
q "UPDATE users SET current_streak=0, longest_streak=0 WHERE id=$UID_" > /dev/null

echo
echo "=== Modul: boshlanmagan modul eslatma bermaydi ==="
CAT=$(q "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id")
MID=$(q "INSERT INTO modules (slug, title, description, category_id, pass_score, estimated_hours)
         VALUES ('${TAG}-slug','${TAG} Module','desc',$CAT,80,10) RETURNING id")
L1=$(q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points) VALUES ('${TAG}_L1','c',$CAT,$MID,0,50) RETURNING id")
L2=$(q "INSERT INTO lessons (title, content, category_id, module_id, order_index, points) VALUES ('${TAG}_L2','c',$CAT,$MID,1,50) RETURNING id")
check "$(has module_unfinished)" "no" "hech bir dars tugatilmagan — turtki yo'q"

echo
echo "=== ⭐ Yarim tugatilgan modul: nechta dars qolganini aytadi ==="
q "INSERT INTO user_lesson_attempts (user_id,lesson_id,status,completed_at) VALUES ($UID_,$L1,'completed',now())" > /dev/null
check "$(has module_unfinished)" "yes" "boshlangan modul eslatiladi"
check "$(field module_unfinished remaining)" "1" "1 ta dars qoldi"
check "$(field module_unfinished moduleId)" "$MID" "modul id uzatiladi"

echo
echo "=== ⭐ Hamma dars tugagach imtihonga chorlaydi ==="
q "INSERT INTO user_lesson_attempts (user_id,lesson_id,status,completed_at) VALUES ($UID_,$L2,'completed',now())" > /dev/null
check "$(has module_unfinished)" "no" "endi 'dars qoldi' demaydi"
check "$(has exam_ready)" "yes" "imtihon ochildi"

echo
echo "=== ⭐ Imtihondan o'tgan, sertifikat olinmagan ==="
q "INSERT INTO module_exam_attempts (user_id, module_id, attempt_count, best_score, passed, passed_at)
   VALUES ($UID_,$MID,1,90,true,now())" > /dev/null
check "$(has exam_ready)" "no" "o'tgandan keyin imtihonga chaqirmaydi"
check "$(has certificate_ready)" "yes" "olinmagan sertifikat eslatiladi"

echo
echo "=== ⭐ Sertifikat olingach butunlay jim ==="
q "INSERT INTO certificates (serial, user_id, module_id, full_name, score)
   VALUES ('CDCTF-${TAG}TEST', $UID_, $MID, 'Test Foydalanuvchi', 90)" > /dev/null
check "$(has certificate_ready)" "no" "sertifikat mavjud — eslatma yo'q"
check "$(kinds)" "" "modul to'liq tugadi, ro'yxat yana bo'sh"

echo
echo "=== ⭐ Yaqinlashayotgan ochiq tadbir ==="
COMP=$(q "INSERT INTO competitions (name, type, start_time, end_time)
          VALUES ('${TAG}_event','public', now() + interval '2 days', now() + interval '3 days') RETURNING id")
check "$(has competition_soon)" "yes" "2 kundan keyingi tadbir eslatiladi"
check "$(field competition_soon competitionId)" "$COMP" "tadbir id uzatiladi"

echo "--- allaqachon ro'yxatdan o'tgan bo'lsa eslatmaydi ---"
q "INSERT INTO competition_users (competition_id, user_id) VALUES ($COMP,$UID_)" > /dev/null
check "$(has competition_soon)" "no" "qatnashuvchiga takror taklif yo'q"

echo "--- uzoqdagi tadbir hozircha eslatilmaydi ---"
q "DELETE FROM competition_users WHERE competition_id=$COMP" > /dev/null
q "UPDATE competitions SET start_time = now() + interval '30 days', end_time = now() + interval '31 days' WHERE id=$COMP" > /dev/null
check "$(has competition_soon)" "no" "30 kun — hali erta"

echo "--- yopiq tadbir umuman eslatilmaydi ---"
q "UPDATE competitions SET type='private', start_time = now() + interval '2 days', end_time = now() + interval '3 days' WHERE id=$COMP" > /dev/null
check "$(has competition_soon)" "no" "private tadbir e'lon qilinmaydi"

echo
echo "=== ⭐ Jonli tadbir eng yuqori ustuvorlikda ==="
q "UPDATE competitions SET type='public', start_time = now() - interval '1 hour', end_time = now() + interval '3 hours' WHERE id=$COMP" > /dev/null
q "UPDATE users SET current_streak=4, last_activity_date=to_char((now() - interval '1 day') at time zone 'UTC','YYYY-MM-DD') WHERE id=$UID_" > /dev/null
check "$(has competition_live)" "yes" "boshlangan tadbir 'live' deb belgilanadi"
check "$(kinds | cut -d, -f1)" "competition_live" "jonli tadbir streakdan oldin turadi"

echo
echo "=== Eng ko'pi 3 ta eslatma ==="
CNT=$(curl -s $API/users/me/reminders -H "Authorization: Bearer $TOK" \
  | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["reminders"]))')
[ "$CNT" -le 3 ] && pass "ro'yxat 3 tadan oshmadi ($CNT)" || fail "3 tadan ko'p keldi: $CNT"

echo
[ -z "${FAILED:-}" ] && echo "🎉 ESLATMALAR TO'G'RI ISHLAYAPTI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
