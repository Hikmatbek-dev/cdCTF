#!/bin/bash
# The referral programme and the invite gate on competitions.
#
# The rule the founder chose: a competition needs five *activated* invites
# behind it, and an invite activates only when the person you brought in both
# verifies their email and does one real thing — a lesson or a solve. Everything
# here proves the "activated, not just signed up" half, because that is the only
# thing standing between a five-invite gate and a pile of throwaway accounts.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="ref$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

# register $1=suffix [$2=ref] -> echoes nothing; login separately
register() {
  local n="${TAG}_$1"
  local body="{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\"}"
  [ -n "$2" ] && body="{\"nickname\":\"$n\",\"email\":\"$n@example.com\",\"password\":\"$PASS\",\"ref\":\"$2\"}"
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' -d "$body"
}
login() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"${TAG}_$1\",\"password\":\"$PASS\"}" | json token; }
uid() { q "SELECT id FROM users WHERE nickname='${TAG}_$1'"; }
verify() { # flip a user's email to verified through the real endpoint
  local tok; tok=$(q "SELECT email_verification_token FROM users WHERE nickname='${TAG}_$1'")
  [ -n "$tok" ] && curl -s -o /dev/null "$API/auth/verify-email?token=$tok"
}

echo
echo "=== ⭐ 1. Referal kodi barqaror va noyob ==="
register root; ROOT=$(login root)
CODE=$(curl -s $API/users/me/referrals -H "Authorization: Bearer $ROOT" | json code)
[ -n "$CODE" ] && pass "kod berildi ($CODE)" || fail "kod berilmadi"
CODE2=$(curl -s $API/users/me/referrals -H "Authorization: Bearer $ROOT" | json code)
check "$CODE2" "$CODE" "kod har chaqiruvda bir xil"

echo
echo "=== ⭐ 2. ?ref bilan ro'yxatdan o'tish — kutilayotgan taklif ==="
register alice "$CODE"
check "$(q "SELECT status FROM referrals WHERE referee_id=$(uid alice)")" "pending" "taklif 'pending' holatda"
check "$(q "SELECT referrer_id FROM referrals WHERE referee_id=$(uid alice)")" "$(uid root)" "to'g'ri taklif qiluvchi"
echo "--- pending hech narsa bermaydi ---"
check "$(curl -s $API/users/me/referrals -H "Authorization: Bearer $ROOT" | json activeCount)" "0" "faol soni hali 0"
check "$(q "SELECT free_hint_credits FROM users WHERE nickname='${TAG}_root'")" "0" "hali bepul hint yo'q"

echo
echo "=== ⭐ 3. Faollashish: email tasdiq + 1 topshiriq ==="
CID=$(q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,is_published)
         VALUES ('${TAG}_c','d','Web','easy',100,'$(printf %s 'flag{ref}' )',true) RETURNING id")
# flag saqlanishi xesh emas — to'g'ridan-to'g'ri solingan; submit path xeshlaydi va solishtiradi
q "UPDATE ctf_tasks SET flag='flag{ref}' WHERE id=$CID" > /dev/null
ALICE=$(login alice)
echo "--- faqat email tasdiq — hali yetarli emas ---"
verify alice
check "$(q "SELECT status FROM referrals WHERE referee_id=$(uid alice)")" "pending" "faqat email bilan faollashmaydi"
echo "--- topshiriqni yechгач faollashadi ---"
curl -s -o /dev/null -X POST $API/ctf/$CID/submit -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ALICE" -d '{"flag":"flag{ref}"}'
sleep 1   # activation fire-and-forget'dan keyin
check "$(q "SELECT status FROM referrals WHERE referee_id=$(uid alice)")" "active" "taklif 'active' bo'ldi"
check "$(q "SELECT free_hint_credits FROM users WHERE nickname='${TAG}_root'")" "1" "taklif qiluvchi +1 bepul hint oldi"
check "$(curl -s $API/users/me/referrals -H "Authorization: Bearer $ROOT" | json activeCount)" "1" "faol soni 1"

echo "--- takroriy solve ikkinchi marta to'lamaydi ---"
curl -s -o /dev/null -X POST $API/ctf/$CID/submit -H 'Content-Type: application/json' -H "Authorization: Bearer $ALICE" -d '{"flag":"flag{ref}"}'
sleep 1
check "$(q "SELECT free_hint_credits FROM users WHERE nickname='${TAG}_root'")" "1" "hint hamon 1 (idempotent)"

echo
echo "=== ⭐ 4. Suiiste'mol yopiq ==="
register selfy
SELFY_CODE=$(curl -s $API/users/me/referrals -H "Authorization: Bearer $(login selfy)" | json code)
register selfy2 "$SELFY_CODE"   # boshqa odam, mayli
# o'zini-o'zi: mavjud foydalanuvchini o'z kodi bilan qayta yozib bo'lmaydi — signup only, shunchaki tekshiramiz kod noto'g'ri bo'lsa yozilmaydi
register nobody "YO-QKOD-XX"
check "$(q "SELECT count(*) FROM referrals WHERE referee_id=$(uid nobody)")" "0" "noma'lum kod — taklif yozilmaydi"

echo
echo "=== ⭐ 5. Musobaqa darvozasi: 5 faol taklif shart ==="
COMP=$(q "INSERT INTO competitions (name,type,start_time,end_time)
          VALUES ('${TAG}_comp','public', now() - interval '1 hour', now() + interval '1 day') RETURNING id")
echo "--- 1 faol taklif bilan — rad etiladi ---"
GATE=$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$COMP/join -H 'Content-Type: application/json' -H "Authorization: Bearer $ROOT")
check "$GATE" "403" "5 dan kam — kirish yopiq"
BODY=$(curl -s -X POST $API/competitions/$COMP/join -H 'Content-Type: application/json' -H "Authorization: Bearer $ROOT")
check "$(echo "$BODY" | json error)" "invite_requirement" "sabab: invite_requirement"
check "$(echo "$BODY" | python3 -c 'import sys,json; print(json.load(sys.stdin)["have"])')" "1" "server 1 ta borligini aytadi"

echo "--- 4 ta qo'shimcha faol taklif (to'g'ridan bazaga) → 5 ta ---"
for i in 1 2 3 4; do
  RU=$(q "INSERT INTO users (nickname,email,password_hash,email_verified) VALUES ('${TAG}_r$i','${TAG}_r$i@e.com','x',true) RETURNING id")
  q "INSERT INTO referrals (referrer_id,referee_id,status,activated_at) VALUES ($(uid root),$RU,'active',now())" > /dev/null
done
check "$(curl -s $API/users/me/referrals -H "Authorization: Bearer $ROOT" | json activeCount)" "5" "endi 5 faol taklif"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/competitions/$COMP/join -H 'Content-Type: application/json' -H "Authorization: Bearer $ROOT")" "201" "5 ta bilan — kirish ochiq"
check "$(curl -s $API/users/me/referrals -H "Authorization: Bearer $ROOT" | json eligibleForCompetitions)" "True" "eligible bayrog'i yoqilgan"

echo
echo "=== ⭐ 6. Bepul hint ball o'rniga sarflanadi ==="
# root'da 5 bepul hint bor (5 faol taklif... aslida 1 real + 4 SQL, kredit faqat real activationda +1). Kreditni aniq qo'yamiz:
q "UPDATE users SET free_hint_credits=1, points=0 WHERE nickname='${TAG}_root'" > /dev/null
HC=$(q "INSERT INTO ctf_tasks (name,description,category,difficulty,points,flag,hint,hint_cost,is_published)
        VALUES ('${TAG}_hc','d','Web','easy',100,'flag{h}','maslahat',50,true) RETURNING id")
curl -s -o /dev/null -X POST $API/ctf/$HC/hint -H "Authorization: Bearer $ROOT"
check "$(q "SELECT free_hint_credits FROM users WHERE nickname='${TAG}_root'")" "0" "bepul hint sarflandi"
check "$(q "SELECT points FROM users WHERE nickname='${TAG}_root'")" "0" "ball tegilmadi (0)"

echo
[ -z "${FAILED:-}" ] && echo "🎉 REFERAL TIZIMI VA MUSOBAQA DARVOZASI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
