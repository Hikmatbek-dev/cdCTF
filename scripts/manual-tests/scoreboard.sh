#!/bin/bash
# Scoreboard: paging, ordering, ranks and search.
#
# The read used to load every matching user, sort in JavaScript and slice — so
# `page` and `limit` saved nothing and the work grew with the user table. It is
# SQL now; these cases pin the behaviour that has to survive that.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

TAG="sb$RANDOM"
echo "=== Seed: 12 ta foydalanuvchi, ballari 120..10 ==="
for i in $(seq 1 12); do
  POINTS=$(( (13 - i) * 10 ))
  psql "$DATABASE_URL" -q -c "INSERT INTO users (nickname, email, password_hash, points, role) VALUES ('${TAG}_u$i','${TAG}_u$i@e.com','x',$POINTS,'user');"
done
# Must not appear: blocked, wrong role, or excluded.
psql "$DATABASE_URL" -q -c "INSERT INTO users (nickname, email, password_hash, points, role, is_blocked) VALUES ('${TAG}_blocked','${TAG}_b@e.com','x',9999,'user',true);"
psql "$DATABASE_URL" -q -c "INSERT INTO users (nickname, email, password_hash, points, role) VALUES ('${TAG}_admin','${TAG}_a@e.com','x',9999,'admin');"
echo "  12 ta oddiy + 1 bloklangan + 1 admin (ikkalasi 9999 ball bilan)"

board() { curl -s "$API/scoreboard?$1"; }
nicks() { python3 -c 'import sys,json; print(",".join(e["nickname"] for e in json.load(sys.stdin)["entries"]))'; }

echo
echo "=== ⭐ Bloklangan va admin ro'yxatda YO'Q (9999 ball bo'lsa ham) ==="
TOP=$(board "limit=100" | nicks)
echo "$TOP" | grep -q "${TAG}_blocked" && fail "bloklangan ko'rindi!" || pass "bloklangan yashirilgan"
echo "$TOP" | grep -q "${TAG}_admin" && fail "admin ko'rindi!" || pass "admin yashirilgan"

echo
echo "=== Tartib: ball bo'yicha kamayish ==="
FIRST=$(board "limit=5" | python3 -c 'import sys,json; print(",".join(str(e["points"]) for e in json.load(sys.stdin)["entries"]))')
echo "  birinchi 5 ta ball: $FIRST"
[ "$(board "limit=5" | python3 -c 'import sys,json; p=[e["points"] for e in json.load(sys.stdin)["entries"]]; print(p == sorted(p, reverse=True))')" = "True" ] \
  && pass "kamayish tartibida" || fail "tartib buzuq"

echo
echo "=== ⭐ Sahifalash SQL'da (JS'da emas) ==="
P1=$(board "page=1&limit=5&search=$TAG" | nicks)
P2=$(board "page=2&limit=5&search=$TAG" | nicks)
P3=$(board "page=3&limit=5&search=$TAG" | nicks)
echo "  1-sahifa: $P1"
echo "  2-sahifa: $P2"
echo "  3-sahifa: $P3"
check "$(echo $P1 | tr ',' '\n' | wc -l)" "5" "1-sahifada 5 ta"
check "$(echo $P3 | tr ',' '\n' | wc -l)" "2" "3-sahifada 2 ta (12 ta jami)"
[ "$P1" != "$P2" ] && pass "sahifalar bir-biridan farq qiladi" || fail "bir xil sahifa qaytdi"
echo "$P1,$P2,$P3" | tr ',' '\n' | sort | uniq -d | grep -q . && fail "sahifalarda takror bor" || pass "takror yo'q"

echo
echo "=== Rank sahifalar bo'ylab o'sib boradi ==="
# `rank` is the user's real rank, not their position in the filtered list, so it
# is not 1..12 here — this suite shares a database with the others and their
# users interleave. What must hold is the ordering.
ranks() { board "$1" | python3 -c 'import sys,json; print(" ".join(str(e["rank"]) for e in json.load(sys.stdin)["entries"]))'; }
RANKS1=$(ranks "page=1&limit=5&search=$TAG")
RANKS2=$(ranks "page=2&limit=5&search=$TAG")
echo "  1-sahifa ranklari: $RANKS1"
echo "  2-sahifa ranklari: $RANKS2"
LAST1=$(echo $RANKS1 | tr ' ' '\n' | tail -1); FIRST2=$(echo $RANKS2 | tr ' ' '\n' | head -1)
[ "$FIRST2" -gt "$LAST1" ] && pass "2-sahifa 1-sahifadan keyin ($LAST1 → $FIRST2)" || fail "sahifalar tartibi buzuq"
[ "$(ranks "page=1&limit=5&search=$TAG" | python3 -c 'import sys; r=[int(x) for x in sys.stdin.read().split()]; print(r == sorted(r))')" = "True" ] \
  && pass "sahifa ichida ranklar o'sib boradi" || fail "sahifa ichida tartib buzuq"

echo
echo "=== total va totalPages ==="
check "$(board "search=$TAG&limit=5" | python3 -c 'import sys,json; print(json.load(sys.stdin)["total"])')" "12" "total = 12"
check "$(board "search=$TAG&limit=5" | python3 -c 'import sys,json; print(json.load(sys.stdin)["totalPages"])')" "3" "totalPages = 3"

echo
echo "=== ⭐ Qidiruv EMAIL bo'yicha ishlamaydi (enumeration oracle edi) ==="
check "$(board "search=${TAG}_u1@e.com" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]))')" "0" "email bo'yicha topilmadi"
# _u1 matches u1, u10, u11 and u12 — it is a substring search.
check "$(board "search=${TAG}_u1" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]))')" "4" "nickname bo'yicha topildi (u1, u10, u11, u12)"

echo
echo "=== ⭐ LIKE wildcard'lari escape qilinadi ==="
# Unescaped, '%' matches everything; escaped, it matches nothing here.
check "$(board "search=%" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]))')" "0" "'%' hamma narsani ochmadi"
# Escaped, '_' matches a literal underscore: every seeded nickname has one, but
# the suite's other users (registered as plain names) do not. Unescaped it would
# match any single character and return every user in the database.
UNDERSCORE=$(board "search=_&limit=100" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]))')
ALL=$(board "limit=100" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]))')
echo "  '_' qidiruvi: $UNDERSCORE ta | umumiy: $ALL ta"
[ "$UNDERSCORE" -lt "$ALL" ] && pass "'_' hamma foydalanuvchini ochmadi (escape ishlaydi)" || fail "'_' wildcard sifatida ishladi!"

echo
echo "=== Qidiruv katta-kichik harfga sezgir emas ==="
check "$(board "search=$(echo $TAG | tr 'a-z' 'A-Z')_U1" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["entries"]) > 0)')" "True" "katta harf bilan ham topildi"

echo
echo "=== ⭐ Qidiruvda ham HAQIQIY rank ko'rsatiladi (ro'yxatdagi o'rin emas) ==="
NICK="${TAG}_me"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$NICK\",\"email\":\"$NICK@e.com\",\"password\":\"$PASS\"}"
psql "$DATABASE_URL" -q -c "UPDATE users SET points = 55 WHERE nickname='$NICK';"
T=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d "{\"nickname\":\"$NICK\",\"password\":\"$PASS\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
MY_RANK=$(curl -s "$API/scoreboard?search=$TAG&limit=100" -H "Authorization: Bearer $T" | python3 -c 'import sys,json; print(json.load(sys.stdin)["currentUserRank"])')
LIST_RANK=$(curl -s "$API/scoreboard?search=$TAG&limit=100" -H "Authorization: Bearer $T" \
  | python3 -c "import sys,json; print(next(e['rank'] for e in json.load(sys.stdin)['entries'] if e['nickname']=='$NICK'))")
echo "  currentUserRank=$MY_RANK, ro'yxatdagi rank=$LIST_RANK"
check "$MY_RANK" "$LIST_RANK" "ikkalasi mos"

echo
echo "=== ⭐ Teng ballarda rank barqaror (so'rovdan so'rovga o'zgarmaydi) ==="
psql "$DATABASE_URL" -q -c "UPDATE users SET points = 100 WHERE nickname IN ('${TAG}_u1','${TAG}_u2','${TAG}_u3');"
A=$(board "search=$TAG&limit=100" | nicks)
B=$(board "search=$TAG&limit=100" | nicks)
check "$A" "$B" "ikki bir xil so'rov bir xil tartib berdi"

echo
[ -z "$FAILED" ] && echo "🎉 SCOREBOARD TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
