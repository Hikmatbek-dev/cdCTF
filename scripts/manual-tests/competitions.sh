#!/bin/bash
# Competitions: joining, submitting, and being paid exactly once.
#
# This whole path had no suite, and it is not an untrodden corner — it is the
# competitive half of the platform, and it has already produced a real bug: the
# solve check, the insert and the points update ran without a transaction, so
# two concurrent submits both passed the "already solved?" test and the account
# was paid twice. That was fixed by hand and then guarded by nothing.
#
# So the double-award case here is not decoration — but be honest about how
# strong it is. Dropping the unique index on (competition, ctf, user) does not
# make it fail, which means these five parallel curls are not reliably landing
# inside each other's transaction: FOR UPDATE locks nothing when the row does
# not exist yet, so the index is what would actually stop a true double insert.
# Read it as "five submits give one solve", which is worth holding, and not as
# proof that a real race is caught. Proving that needs two requests paused
# mid-transaction, which this cannot do from curl.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="cmp$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }

q() { psql "$DATABASE_URL" -tAqc "$1"; }

# The flag limiter allows 10/min and this suite deliberately submits more —
# including five at once for the race. Clearing the counter keeps those 429s out
# of results that are about competitions. rate-limit.sh is what proves the
# limiter works; here it is only in the way.
resetlimit() { psql "$DATABASE_URL" -q -c "TRUNCATE rate_limits" > /dev/null 2>&1; }

mkuser() { # $1 = suffix -> "token id"
  local n="${TAG}_$1"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  local tok id
  tok=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"nickname\":\"$n\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
  id=$(q "SELECT id FROM users WHERE nickname='$n'")
  echo "$tok $id"
}

# Flags are stored hashed, so seed them the way the server would write them.
hashflag() { printf 'sha256$%s' "$(printf '%s' "$1" | sha256sum | cut -d' ' -f1)"; }

mkctf() { # $1 = name suffix, $2 = flag, $3 = points -> id
  q "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, is_published)
     VALUES ('${TAG}_$1','d','Web','easy',$3,'$(hashflag "$2")', true) RETURNING id"
}

mkcomp() { # $1 = suffix, $2 = type, $3 = invite|NULL, $4 = start offset, $5 = end offset -> id
  local code="NULL"; [ "$3" != "NULL" ] && code="'$3'"
  q "INSERT INTO competitions (name, type, invite_code, start_time, end_time)
     VALUES ('${TAG}_$1','$2',$code, now() + interval '$4', now() + interval '$5') RETURNING id"
}

# Not UID: bash makes that readonly (it is the OS user id), so the assignment
# silently does nothing and every lookup below asks about user 1000.
read -r TOK U1_ID <<< "$(mkuser u1)"
read -r TOK2 U2_ID <<< "$(mkuser u2)"

CTF=$(mkctf t1 'Flag{comp}' 250)
COMP=$(mkcomp active public NULL '-1 hour' '+1 hour')
q "INSERT INTO competition_tasks (competition_id, ctf_id) VALUES ($COMP,$CTF)" > /dev/null

sub() { # $1 = token, $2 = comp, $3 = ctf, $4 = flag -> body
  curl -s -X POST $API/competitions/$2/ctf/$3/submit -H "Authorization: Bearer $1" \
    -H 'Content-Type: application/json' -d "{\"flag\":\"$4\"}"
}
subcode() { # same -> http code
  curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$2/ctf/$3/submit \
    -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "{\"flag\":\"$4\"}"
}

echo "=== A'zo bo'lmasdan flag yuborib bo'lmaydi ==="
check "$(subcode $TOK $COMP $CTF 'Flag{comp}')" "403" "qo'shilmagan foydalanuvchi rad etildi"
check "$(q "SELECT count(*) FROM competition_solves WHERE competition_id=$COMP")" "0" "yechim yozilmadi"

echo
echo "=== Ochiq musobaqaga qo'shilish ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$COMP/join -H "Authorization: Bearer $TOK")" "201" "qo'shildi"

echo
echo "=== Noto'g'ri flag ball bermaydi ==="
check "$(sub $TOK $COMP $CTF 'Flag{wrong}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("correct"))')" "False" "noto'g'ri flag rad etildi"
check "$(q "SELECT count(*) FROM competition_solves WHERE competition_id=$COMP")" "0" "yechim yozilmadi"

echo
echo "=== To'g'ri flag bir marta ball beradi ==="
check "$(sub $TOK $COMP $CTF 'Flag{comp}' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("pointsEarned"))')" "250" "250 ball berildi"
check "$(q "SELECT points_earned FROM competition_solves WHERE competition_id=$COMP AND user_id=$U1_ID")" "250" "yechim bazada 250 ball bilan"

echo
resetlimit
echo "=== ⭐ IKKI BARAVAR BALL YO'Q — bir vaqtda ikkita yuborish ==="
# Sent at once rather than in sequence: a sequential retry is the alreadySolved
# path below, which is a different check. See the header on what this does and
# does not prove.
CTF2=$(mkctf t2 'Flag{race}' 300)
q "INSERT INTO competition_tasks (competition_id, ctf_id) VALUES ($COMP,$CTF2)" > /dev/null
for i in 1 2 3 4 5; do sub $TOK $COMP $CTF2 'Flag{race}' > /dev/null & done
wait
check "$(q "SELECT count(*) FROM competition_solves WHERE competition_id=$COMP AND ctf_id=$CTF2")" "1" "bir vaqtda 5 ta yuborishdan 1 ta yechim"
check "$(q "SELECT coalesce(sum(points_earned),0) FROM competition_solves WHERE competition_id=$COMP AND user_id=$U1_ID")" "550" "jami 550 (250+300), ko'p emas"

echo
resetlimit
echo "=== Takroriy yuborish qayta to'lamaydi ==="
check "$(sub $TOK $COMP $CTF 'Flag{comp}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("alreadySolved"))')" "True" "alreadySolved deb javob berdi"
check "$(q "SELECT coalesce(sum(points_earned),0) FROM competition_solves WHERE user_id=$U1_ID AND competition_id=$COMP")" "550" "ball o'zgarmadi"

echo
resetlimit
echo "=== Musobaqada yo'q vazifa ==="
OTHER=$(mkctf outside 'Flag{out}' 100)
check "$(subcode $TOK $COMP $OTHER 'Flag{out}')" "404" "begona vazifa rad etildi"

echo
resetlimit
echo "=== Vaqt oynasi qo'llanadi ==="
FUT=$(mkcomp future public NULL '+1 hour' '+2 hours')
PAST=$(mkcomp past public NULL '-2 hours' '-1 hour')
q "INSERT INTO competition_tasks (competition_id, ctf_id) VALUES ($FUT,$CTF),($PAST,$CTF)" > /dev/null
q "INSERT INTO competition_users (competition_id, user_id) VALUES ($FUT,$U1_ID)" > /dev/null
q "INSERT INTO competition_users (competition_id, user_id) VALUES ($PAST,$U1_ID)" > /dev/null
check "$(subcode $TOK $FUT $CTF 'Flag{comp}')" "403" "boshlanmagan musobaqaga yuborib bo'lmadi"
check "$(subcode $TOK $PAST $CTF 'Flag{comp}')" "403" "tugagan musobaqaga yuborib bo'lmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$PAST/join -H "Authorization: Bearer $TOK2")" "400" "tugaganiga qo'shilib bo'lmadi"

echo
echo "=== ⭐ Yopiq musobaqa: taklif kodi haqiqatan tekshiriladi ==="
PRIV=$(mkcomp private private 'secret123' '-1 hour' '+1 hour')
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$PRIV/join -H "Authorization: Bearer $TOK2" \
  -H 'Content-Type: application/json' -d '{"inviteCode":"wrong"}')" "403" "noto'g'ri kod rad etildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$PRIV/join -H "Authorization: Bearer $TOK2")" "403" "kodsiz rad etildi"
check "$(q "SELECT count(*) FROM competition_users WHERE competition_id=$PRIV")" "0" "a'zo qo'shilmadi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$PRIV/join -H "Authorization: Bearer $TOK2" \
  -H 'Content-Type: application/json' -d '{"inviteCode":"secret123"}')" "201" "to'g'ri kod bilan qo'shildi"

echo
echo "=== Scoreboard yechimlarni aks ettiradi ==="
SB=$(curl -s $API/competitions/$COMP/scoreboard | python3 -c '
import sys, json
rows = json.load(sys.stdin)
me = [r for r in rows if r.get("userId") == '"$U1_ID"']
print(me[0].get("points") if me else "topilmadi")')
check "$SB" "550" "scoreboard 550 ball ko'rsatdi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 MUSOBAQALAR TO'G'RI VA BIR MARTA TO'LAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
