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
echo "=== ⭐ ASOSIY CTF + MUSOBAQA — bir vazifa ikki marta TO'LAMAYDI ==="
# A challenge solved in the main pool must not pay again inside a competition
# that shares it. The competition solve is still recorded (its own leaderboard),
# but the global users.points moves once. Before the fix this paid twice.
#
# A fresh user with one solve — so the category-title bonus (3 solves) never
# fires and U1's running total below is left untouched.
read -r TOK3 U3_ID <<< "$(mkuser u3)"
curl -s -o /dev/null -X POST $API/competitions/$COMP/join -H "Authorization: Bearer $TOK3"
SHARED=$(mkctf shared 'Flag{shared}' 400)
q "INSERT INTO competition_tasks (competition_id, ctf_id) VALUES ($COMP,$SHARED)" > /dev/null
resetlimit
# solve it in the MAIN pool first — awards global points once
curl -s -X POST $API/ctf/$SHARED/submit -H "Authorization: Bearer $TOK3" \
  -H 'Content-Type: application/json' -d '{"flag":"Flag{shared}"}' > /dev/null
AFTER_MAIN=$(q "SELECT points FROM users WHERE id=$U3_ID")
check "$AFTER_MAIN" "400" "asosiy CTF 400 ball berdi"
# now the same challenge inside the competition — must not pay again
resetlimit
COMP_PTS=$(sub $TOK3 $COMP $SHARED 'Flag{shared}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("pointsEarned"))')
AFTER_COMP=$(q "SELECT points FROM users WHERE id=$U3_ID")
check "$COMP_PTS" "0" "musobaqa global ball bermadi (allaqachon sanalgan)"
check "$AFTER_COMP" "400" "global users.points 400da qoldi (ikki marta emas)"
check "$(q "SELECT count(*) FROM competition_solves WHERE competition_id=$COMP AND ctf_id=$SHARED AND user_id=$U3_ID")" "1" "musobaqa yechimi baribir qayd etildi"

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
echo "=== ⭐ HOMIY BRENDI — musobaqa sahifasida ko'rinadi ==="
# A sponsored competition is the fastest revenue path; the event page must
# surface the sponsor and prize the API stores. The INSERT below also proves
# ensureDatabaseShape() created the sponsor columns — it would error otherwise.
SPCOMP=$(q "INSERT INTO competitions (name, type, start_time, end_time, sponsor_name, sponsor_logo_url, sponsor_url, prize)
  VALUES ('${TAG}_sponsored','public', now() - interval '1 hour', now() + interval '1 hour',
          'IT Park Uzbekistan','https://itpark.uz/logo.png','https://itpark.uz','5,000,000 UZS') RETURNING id")
SPBODY=$(curl -s $API/competitions/$SPCOMP)
check "$(echo "$SPBODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("sponsorName"))')" "IT Park Uzbekistan" "homiy nomi qaytdi"
check "$(echo "$SPBODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("prize"))')" "5,000,000 UZS" "sovrin qaytdi"
check "$(echo "$SPBODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("sponsorUrl"))')" "https://itpark.uz" "homiy havolasi qaytdi"
# And on the list endpoint, so a card can show the "Homiy" badge.
check "$(curl -s $API/competitions | python3 -c 'import sys,json;print([c["sponsorName"] for c in json.load(sys.stdin) if c["id"]=='"$SPCOMP"'][0])')" "IT Park Uzbekistan" "ro'yxatda ham homiy nomi bor"

echo
echo "=== ⭐ OG PREVIEW — Telegram uchun meta teglar ==="
# Crawlers get server-rendered OG tags (humans get the SPA). The route is
# reachable directly; Vercel only maps crawler user-agents onto it.
OG=$(curl -s $API/og/competition/$SPCOMP)
check "$(echo "$OG" | grep -c 'property="og:title" content="'"${TAG}"'_sponsored')" "1" "og:title musobaqa nomi bilan"
check "$(echo "$OG" | grep 'property="og:description"' | grep -c 'IT Park Uzbekistan')" "1" "og:description homiyni o'z ichiga oladi"
check "$(echo "$OG" | grep -c 'property="og:image" content="https://itpark.uz/logo.png"')" "1" "og:image homiy logosi"
check "$(echo "$OG" | grep -c 'name="twitter:card" content="summary_large_image"')" "1" "twitter:card katta rasm"
# A missing competition must not 500 — it degrades to a generic preview.
check "$(curl -s -o /dev/null -w '%{http_code}' $API/og/competition/999999)" "200" "yo'q musobaqa 200 (umumiy preview)"
# HTML escaping: an XSS-y competition name must be escaped in the tag.
XSSID=$(q "INSERT INTO competitions (name, type, start_time, end_time) VALUES ('<script>x</script>','public', now(), now() + interval '1 hour') RETURNING id")
check "$(curl -s $API/og/competition/$XSSID | grep -c '<script>x</script>')" "0" "nomdagi HTML qochiriladi (XSS yo'q)"

echo
resetlimit
echo "=== ⭐ JAMOA — umumiy yechim (bir yechim butun jamoaga bir marta) ==="
read -r TT1 T1ID <<< "$(mkuser tu1)"
read -r TT2 T2ID <<< "$(mkuser tu2)"
read -r TT3 T3ID <<< "$(mkuser tu3team)"
TCOMP=$(mkcomp tactive public NULL '-1 hour' '+1 hour')
TC1=$(mkctf tc1 'Flag{team1}' 150)
TC2=$(mkctf tc2 'Flag{team2}' 250)
q "INSERT INTO competition_tasks (competition_id, ctf_id) VALUES ($TCOMP,$TC1),($TCOMP,$TC2)" > /dev/null

# Captain creates a team. This also proves ensureDatabaseShape built the team
# tables — the insert would fail otherwise.
CREATE=$(curl -s -X POST $API/competitions/$TCOMP/teams -H "Authorization: Bearer $TT1" \
  -H 'Content-Type: application/json' -d '{"name":"Alpha"}')
TEAMCODE=$(echo "$CREATE" | python3 -c 'import sys,json;print(json.load(sys.stdin)["inviteCode"])')
check "$(echo "$CREATE" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("isCaptain"))')" "True" "kapitan jamoa yaratdi"
check "$(q "SELECT team_id IS NOT NULL FROM competition_users WHERE competition_id=$TCOMP AND user_id=$T1ID")" "t" "kapitan jamoaga bog'landi"

# A second user joins by the team code.
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$TCOMP/teams/join -H "Authorization: Bearer $TT2" \
  -H 'Content-Type: application/json' -d "{\"inviteCode\":\"$TEAMCODE\"}")" "201" "a'zo kod bilan qo'shildi"
# Same team name in the same competition is rejected.
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$TCOMP/teams -H "Authorization: Bearer $TT3" \
  -H 'Content-Type: application/json' -d '{"name":"Alpha"}')" "409" "bir xil jamoa nomi rad etildi"
# A user already in a team cannot create another.
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$TCOMP/teams -H "Authorization: Bearer $TT1" \
  -H 'Content-Type: application/json' -d '{"name":"Beta"}')" "409" "jamoadagi odam ikkinchisini yarata olmaydi"

resetlimit
# Captain solves tc1 → team earns 150.
check "$(sub $TT1 $TCOMP $TC1 'Flag{team1}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("pointsEarned"))')" "150" "kapitan tc1 yechdi +150"
# Teammate submits the SAME challenge → already solved by the team, 0 points.
MB=$(sub $TT2 $TCOMP $TC1 'Flag{team1}')
check "$(echo "$MB" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("alreadySolved"))')" "True" "a'zo uchun jamoa allaqachon yechgan"
check "$(echo "$MB" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("pointsEarned"))')" "0" "a'zoga ball berilmadi"
check "$(q "SELECT count(*) FROM competition_solves WHERE competition_id=$TCOMP AND ctf_id=$TC1 AND team_id IS NOT NULL")" "1" "jamoa uchun tc1 aynan bir marta yozildi"

resetlimit
# Teammate solves a DIFFERENT challenge → the team's shared score grows.
check "$(sub $TT2 $TCOMP $TC2 'Flag{team2}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("pointsEarned"))')" "250" "a'zo tc2 yechdi +250"

# Team leaderboard: combined 400, two solves, two members.
TB=$(curl -s $API/competitions/$TCOMP/teams)
check "$(echo "$TB" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["points"])')" "400" "jamoa balli 150+250=400"
check "$(echo "$TB" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["solvedCount"])')" "2" "jamoa 2 topshiriq yechdi"
check "$(echo "$TB" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d[0]["members"]))')" "2" "jamoada 2 a'zo"

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
