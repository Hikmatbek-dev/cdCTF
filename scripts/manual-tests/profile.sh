#!/bin/bash
# Profile and dashboard: the shape and the numbers.
#
# getProfileData was a nest of N+1s — a query per solved challenge, per lesson,
# per competition, plus a full scan of every solve in each competition to work
# out one rank. It is joins and a window function now; this pins the output that
# had to survive the rewrite.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

TAG="pf$RANDOM"
mkuser() {
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@e.com\",\"password\":\"$PASS\"}"
  echo "$n"
}
tokenOf() {
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$1\",\"password\":\"$PASS\"}" | json token
}

echo "=== Seed: 2 ta CTF, 1 ta dars, 1 ta musobaqa ==="
U=$(mkuser me); T=$(tokenOf "$U")
UID_=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE nickname='$U';")
RIVAL=$(mkuser rival); RID=$(psql "$DATABASE_URL" -tAqc "SELECT id FROM users WHERE nickname='$RIVAL';")

C1=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_c1','d','Web','easy',100,'f',true) RETURNING id;")
C2=$(psql "$DATABASE_URL" -tAqc "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_c2','d','Crypto','easy',200,'f',true) RETURNING id;")
psql "$DATABASE_URL" -q -c "INSERT INTO ctf_attempts (user_id,ctf_id,solved,solved_at) VALUES ($UID_,$C1,true,now()),($UID_,$C2,true,now());"

CAT=$(psql "$DATABASE_URL" -tAqc "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id;")
L1=$(psql "$DATABASE_URL" -tAqc "INSERT INTO lessons (title,content,category_id,points,is_published) VALUES ('${TAG}_l1','c',$CAT,50,true) RETURNING id;")
psql "$DATABASE_URL" -q -c "INSERT INTO user_lesson_attempts (user_id,lesson_id,status,completed_at) VALUES ($UID_,$L1,'completed',now());"

TID=$(psql "$DATABASE_URL" -tAqc "INSERT INTO titles (name,category,points) VALUES ('${TAG}_title','${TAG}_c',500) RETURNING id;")
psql "$DATABASE_URL" -q -c "INSERT INTO user_titles (user_id,title_id) VALUES ($UID_,$TID);"

COMP=$(psql "$DATABASE_URL" -tAqc "INSERT INTO competitions (name,start_time,end_time) VALUES ('${TAG}_comp', now() - interval '1 day', now() + interval '1 day') RETURNING id;")
psql "$DATABASE_URL" -q -c "INSERT INTO competition_users (competition_id,user_id) VALUES ($COMP,$UID_),($COMP,$RID);"
psql "$DATABASE_URL" -q -c "INSERT INTO competition_solves (competition_id,user_id,ctf_id,points_earned) VALUES ($COMP,$UID_,$C1,100);"
# The rival scores more, so the ranks must differ.
psql "$DATABASE_URL" -q -c "INSERT INTO competition_solves (competition_id,user_id,ctf_id,points_earned) VALUES ($COMP,$RID,$C1,100),($COMP,$RID,$C2,200);"
psql "$DATABASE_URL" -q -c "UPDATE users SET points = 350 WHERE nickname='$U';"
echo "  tayyor: 2 yechim, 1 dars, 1 title, 1 musobaqa (raqib ko'proq ball to'plagan)"

echo
echo "=== Profil to'liq va to'g'ri ==="
P=$(curl -s $API/users/me/profile -H "Authorization: Bearer $T")
check "$(echo "$P" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["solvedCtf"]))')" "2" "2 ta yechilgan CTF"
check "$(echo "$P" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["completedLessons"]))')" "1" "1 ta dars"
check "$(echo "$P" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["titles"]))')" "1" "1 ta title"
check "$(echo "$P" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["competitionHistory"]))')" "1" "1 ta musobaqa"

echo
echo "=== Join maydonlarni yo'qotmadi ==="
check "$(echo "$P" | python3 -c 'import sys,json; c=json.load(sys.stdin)["solvedCtf"]; print(sorted(x["name"] for x in c)[0])')" "${TAG}_c1" "CTF nomi bor"
check "$(echo "$P" | python3 -c 'import sys,json; c=json.load(sys.stdin)["solvedCtf"]; print(sorted(x["category"] for x in c)[0])')" "Crypto" "kategoriya bor"
check "$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin)["completedLessons"][0]["title"])')" "${TAG}_l1" "dars sarlavhasi bor"
check "$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin)["titles"][0]["name"])')" "${TAG}_title" "title nomi bor"
check "$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin)["titles"][0]["points"])')" "500" "title balli bor"
echo "$P" | python3 -c 'import sys,json; s=json.load(sys.stdin)["solvedCtf"]; sys.exit(0 if all(x["solvedAt"] for x in s) else 1)' \
  && pass "solvedAt saqlandi" || fail "solvedAt yo'qoldi"

echo
echo "=== ⭐ Musobaqadagi rank: raqib ko'proq to'plagan ==="
MY_COMP=$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin)["competitionHistory"][0]["rank"])')
MY_PTS=$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin)["competitionHistory"][0]["points"])')
echo "  mening musobaqa ballim: $MY_PTS, rank: $MY_COMP"
check "$MY_PTS" "100" "musobaqa balli to'g'ri"
check "$MY_COMP" "2" "raqib 300 to'plagani uchun men 2-o'rinda"
check "$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin)["competitionHistory"][0]["competitionName"])')" "${TAG}_comp" "musobaqa nomi bor"

echo
echo "=== Global rank ro'yxatdagi bilan mos ==="
PROFILE_RANK=$(echo "$P" | json rank)
BOARD_RANK=$(curl -s "$API/scoreboard?search=${TAG}_me&limit=10" -H "Authorization: Bearer $T" \
  | python3 -c 'import sys,json; e=json.load(sys.stdin)["entries"]; print(e[0]["rank"] if e else "yo_q")')
echo "  profil rank=$PROFILE_RANK, scoreboard rank=$BOARD_RANK"
check "$PROFILE_RANK" "$BOARD_RANK" "profil va scoreboard bir xil rank beradi"

echo
echo "=== Dashboard ==="
D=$(curl -s $API/users/me/dashboard -H "Authorization: Bearer $T")
check "$(echo "$D" | python3 -c 'import sys,json; print(json.load(sys.stdin)["progress"]["solvedCtfCount"])')" "2" "dashboard: 2 yechim"
check "$(echo "$D" | python3 -c 'import sys,json; print(json.load(sys.stdin)["progress"]["completedLessonCount"])')" "1" "dashboard: 1 dars"
check "$(echo "$D" | python3 -c 'import sys,json; print(json.load(sys.stdin)["progress"]["titleCount"])')" "1" "dashboard: 1 title"
check "$(echo "$D" | python3 -c 'import sys,json; print(json.load(sys.stdin)["user"]["rank"])')" "$PROFILE_RANK" "dashboard rank profil bilan mos"

echo
echo "=== ⭐ Boshqa foydalanuvchining emaili ko'rinmaydi ==="
OTHER=$(curl -s $API/users/$RID -H "Authorization: Bearer $T")
check "$(echo "$OTHER" | json email)" "" "begona email bo'sh"
check "$(curl -s $API/users/me/profile -H "Authorization: Bearer $T" | json email)" "${U}@e.com" "o'z emailim ko'rinadi"

echo
echo "=== ⭐ ISHGA TAYYORMAN — talent pipeline belgisi ==="
# Default off. The column exists because ensureDatabaseShape added it; a missing
# column would make this read null, not false.
check "$(echo "$P" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("openToWork"))')" "False" "boshida o'chiq"
# The user flips it on via the normal profile PATCH (self only).
curl -s -o /dev/null -X PATCH $API/users/$UID_ -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"openToWork":true}'
check "$(curl -s $API/users/me/profile -H "Authorization: Bearer $T" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("openToWork"))')" "True" "profilda yoqildi"
check "$(psql "$DATABASE_URL" -tAqc "SELECT open_to_work FROM users WHERE nickname='$U';")" "t" "bazada saqlandi"
# And it surfaces on the scoreboard row so a recruiter can spot it.
check "$(curl -s "$API/scoreboard?search=$U" | python3 -c 'import sys,json; d=json.load(sys.stdin); e=[r for r in d["entries"] if r["userId"]=='"$UID_"']; print(e[0]["openToWork"] if e else "topilmadi")')" "True" "scoreboardda ko'rinadi"
# A user cannot flip it on someone else's account.
curl -s -o /dev/null -X PATCH $API/users/$RID -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"openToWork":true}'
check "$(psql "$DATABASE_URL" -tAqc "SELECT open_to_work FROM users WHERE id=$RID;")" "f" "begona hisobga tegib bo'lmaydi"

echo
echo "=== ⭐ TALENT DIRECTORY — faqat ishga tayyorlar ko'rinadi ==="
# Public, no auth. The opted-in user must appear; the rival (open_to_work=false)
# must not.
TAL=$(curl -s "$API/talent")
check "$(echo "$TAL" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(any(e["userId"]=='"$UID_"' for e in d["entries"]))')" "True" "ishga tayyor foydalanuvchi ro'yxatda"
check "$(echo "$TAL" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(any(e["userId"]=='"$RID"' for e in d["entries"]))')" "False" "tayyor bo'lmagan ko'rinmaydi"
# The entry carries the recruiter signal: solved count comes through.
check "$(echo "$TAL" | python3 -c 'import sys,json; d=json.load(sys.stdin); e=[x for x in d["entries"] if x["userId"]=='"$UID_"'][0]; print(e["solvedCtfCount"])')" "2" "yechilgan CTF soni to'g'ri"

echo
echo "=== ⭐ GET profil bazani O'ZGARTIRMAYDI (idempotent) ==="
psql "$DATABASE_URL" -q -c "UPDATE users SET points = 350 WHERE nickname='$U';"
curl -s -o /dev/null $API/users/me/dashboard -H "Authorization: Bearer $T"
curl -s -o /dev/null $API/users/me/profile -H "Authorization: Bearer $T"
check "$(psql "$DATABASE_URL" -tAqc "SELECT points FROM users WHERE nickname='$U';")" "350" "ball o'zgarmadi"

echo
[ -z "$FAILED" ] && echo "🎉 PROFIL TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
