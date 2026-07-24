#!/bin/bash
# Public platform statistics: the numbers are counted live from the database.
API=http://localhost:${API_PORT:-8099}/api

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
field() { python3 -c "import sys,json;print(json.load(sys.stdin).get('$1'))"; }

TAG="st$RANDOM"

echo "=== Statistika endpointi to'liq va autentifikatsiyasiz ==="
S=$(curl -s $API/stats)
check "$(echo "$S" | field languages)" "3" "tillar 3 ta"
# Every expected key must be a non-negative integer.
check "$(echo "$S" | python3 -c 'import sys,json
d=json.load(sys.stdin)
keys=["learners","modules","lessons","challenges","challengesSolved","lessonsCompleted","certificatesIssued","competitions","openToWork","languages"]
print(all(isinstance(d.get(k),int) and d.get(k)>=0 for k in keys))')" "True" "barcha maydonlar butun son"

echo
echo "=== Raqamlar jonli — yangi topshiriq hisobga qo'shiladi ==="
BEFORE=$(curl -s $API/stats | field challenges)
q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_c','d','Web','easy',100,'f',true)" > /dev/null
AFTER=$(curl -s $API/stats | field challenges)
check "$([ "$AFTER" -gt "$BEFORE" ] && echo yes || echo no)" "yes" "yangi topshiriqdan keyin son oshdi ($BEFORE → $AFTER)"

echo
echo "=== Nashr etilmagan topshiriq ochiq songa kirmaydi ==="
BEFORE2=$(curl -s $API/stats | field challenges)
q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published) VALUES ('${TAG}_hidden','d','Web','easy',100,'f',false)" > /dev/null
AFTER2=$(curl -s $API/stats | field challenges)
check "$AFTER2" "$BEFORE2" "nashr etilmagan topshiriq songa qo'shilmadi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 STATISTIKA JONLI VA TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
