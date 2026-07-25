#!/bin/bash
# Daily activity streaks: a solve bumps the streak once per UTC day, a gap resets it.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
resetlimit() { psql "$DATABASE_URL" -q -c "TRUNCATE rate_limits" >/dev/null 2>&1; }

TAG="stk$RANDOM"
N="${TAG}_u"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"email\":\"$N@e.com\",\"password\":\"$PASS\"}"
TOK=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d "{\"nickname\":\"$N\",\"password\":\"$PASS\"}" | json token)
UID_=$(q "SELECT id FROM users WHERE nickname='$N';")

mkctf() { # $1 suffix, $2 flag -> id
  q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published)
     VALUES ('${TAG}_$1','d','Web','easy',100,'sha256\$$(printf '%s' "$2" | sha256sum | cut -d' ' -f1)', true) RETURNING id;"
}
solve() { # $1 ctfId, $2 flag
  curl -s -X POST $API/ctf/$1/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d "{\"flag\":\"$2\"}"
}
C1=$(mkctf c1 'Flag{s1}'); C2=$(mkctf c2 'Flag{s2}'); C3=$(mkctf c3 'Flag{s3}'); C4=$(mkctf c4 'Flag{s4}')
TODAY=$(date -u +%F)

echo "=== Boshida streak 0 ==="
check "$(q "SELECT current_streak FROM users WHERE id=$UID_")" "0" "yangi foydalanuvchida 0"

echo
echo "=== Birinchi yechim streakni 1 qiladi ==="
resetlimit
check "$(solve $C1 'Flag{s1}' | json correct)" "True" "flag to'g'ri"
check "$(q "SELECT current_streak FROM users WHERE id=$UID_")" "1" "streak = 1"
check "$(q "SELECT longest_streak FROM users WHERE id=$UID_")" "1" "eng uzun = 1"
check "$(q "SELECT last_activity_date FROM users WHERE id=$UID_")" "$TODAY" "sana bugun"

echo
echo "=== ⭐ Bir kunda ikkinchi yechim streakni oshirmaydi ==="
resetlimit
solve $C2 'Flag{s2}' >/dev/null
check "$(q "SELECT current_streak FROM users WHERE id=$UID_")" "1" "streak hali ham 1 (bir kun = bir marta)"

echo
echo "=== ⭐ Ketma-ket kun streakni oshiradi ==="
# Simulate that the last activity was yesterday, then solve today.
q "UPDATE users SET last_activity_date = to_char((now() - interval '1 day') at time zone 'UTC','YYYY-MM-DD') WHERE id=$UID_" >/dev/null
resetlimit
solve $C3 'Flag{s3}' >/dev/null
check "$(q "SELECT current_streak FROM users WHERE id=$UID_")" "2" "streak = 2"
check "$(q "SELECT longest_streak FROM users WHERE id=$UID_")" "2" "eng uzun = 2"

echo
echo "=== ⭐ Kun o'tkazib yuborilsa streak 1 ga tushadi ==="
q "UPDATE users SET last_activity_date = to_char((now() - interval '3 day') at time zone 'UTC','YYYY-MM-DD') WHERE id=$UID_" >/dev/null
resetlimit
solve $C4 'Flag{s4}' >/dev/null
check "$(q "SELECT current_streak FROM users WHERE id=$UID_")" "1" "tanaffusdan keyin streak = 1"
check "$(q "SELECT longest_streak FROM users WHERE id=$UID_")" "2" "eng uzun 2 bo'lib qoladi"

echo
echo "=== Dashboard streakni ko'rsatadi ==="
D=$(curl -s $API/users/me/dashboard -H "Authorization: Bearer $TOK")
check "$(echo "$D" | python3 -c 'import sys,json;print(json.load(sys.stdin)["progress"]["currentStreak"])')" "1" "dashboard current = 1"
check "$(echo "$D" | python3 -c 'import sys,json;print(json.load(sys.stdin)["progress"]["longestStreak"])')" "2" "dashboard longest = 2"

echo
[ -z "${FAILED:-}" ] && echo "🎉 STREAK TIZIMI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
