#!/bin/bash
# The fix must not break the feature: legitimate submissions still have to work.
# Each case gets a fresh user so the 3-attempt cap never interferes.
API=http://localhost:8099/api
PASS='Str0ng!Passw0rd'
LESSON=1

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3 (kutilgan: $2)" || fail "$3 — kutilgan $2, kelgan $1"; }

new_user() {
  local n="u$RANDOM$RANDOM"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
}

submit() { # $1=token $2=python expr for selectedOption given index i
  local tok=$1 expr=$2
  local out sid qids
  out=$(curl -s -X POST $API/learn/lessons/$LESSON/test/start -H "Authorization: Bearer $tok" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("sessionId",""), " ".join(str(q["id"]) for q in d.get("questions",[])))')
  read -r sid qids <<< "$out"
  local payload
  payload=$(python3 -c "
import json
qids = '$qids'.split()
answers = [{'questionId': int(q), 'selectedOption': ($expr)} for i, q in enumerate(qids)]
print(json.dumps({'sessionId': '$sid', 'answers': answers}))")
  curl -s -X POST $API/learn/lessons/$LESSON/test/submit -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $tok" -d "$payload"
}

echo "=== 5/5 to'g'ri → o'tishi va 50 ball berishi kerak ==="
T=$(new_user); R=$(submit "$T" "2"); echo "  → $R"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["passed"])')" "True" "o'tdi"
check "$(echo "$R" | python3 -c 'import sys,json; print(float(json.load(sys.stdin)["score"]))')" "1.0" "score = 1.0 (oshmadi)"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["correctCount"])')" "5" "5 ta to'g'ri sanaldi"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["pointsEarned"])')" "50" "50 ball"

echo "=== 4/5 to'g'ri (0.8) → chegarada o'tishi kerak ==="
T=$(new_user); R=$(submit "$T" "2 if i < 4 else 0"); echo "  → $R"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["passed"])')" "True" "0.8 chegarada o'tdi"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["correctCount"])')" "4" "4 ta to'g'ri sanaldi"

echo "=== 3/5 to'g'ri (0.6) → yiqilishi kerak ==="
T=$(new_user); R=$(submit "$T" "2 if i < 3 else 0"); echo "  → $R"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["passed"])')" "False" "0.6 yiqildi"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["correctCount"])')" "3" "3 ta to'g'ri sanaldi"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["pointsEarned"])')" "0" "ball berilmadi"

echo "=== Ikki marta o'tish ballni ikki marta bermasligi kerak ==="
T=$(new_user)
submit "$T" "2" > /dev/null
NICK_PTS_1=$(psql "$DATABASE_URL" -tAqc "SELECT points FROM users ORDER BY id DESC LIMIT 1;")
R=$(submit "$T" "2")
NICK_PTS_2=$(psql "$DATABASE_URL" -tAqc "SELECT points FROM users ORDER BY id DESC LIMIT 1;")
echo "  → 1-topshiruvdan keyin: $NICK_PTS_1 ball, 2-topshiruvdan keyin: $NICK_PTS_2 ball"
check "$NICK_PTS_2" "$NICK_PTS_1" "qayta topshirish ball QO'SHMADI"
check "$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["pointsEarned"])')" "0" "ikkinchi marta 0 ball qaytardi"

echo
[ -z "$FAILED" ] && echo "🎉 HALOL YO'L BUZILMAGAN" || echo "⚠️  TUZATISH FUNKSIYANI BUZDI"
