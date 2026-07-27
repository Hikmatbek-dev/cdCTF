#!/bin/bash
# The Uzbekistan-set challenge pack: content file + importer.
#
# Content is the one part of this platform that cannot be typechecked, so it
# gets tested instead. The checks that matter are not "did rows appear" but:
#
#   - is every documented flag actually accepted by the live submit endpoint
#     (a challenge whose stated answer is wrong is worse than no challenge)
#   - is the flag stored hashed, never in plaintext
#   - is re-running the importer safe
#   - does --undo refuse to delete a challenge somebody has already solved
#
# Runs last in run-all.sh: it adds real rows to the shared throwaway database.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="uzc$RANDOM"
ROOT=$(cd "$(dirname "$0")/../.." && pwd)

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
resetlimit() { psql "$DATABASE_URL" -q -c "TRUNCATE rate_limits" >/dev/null 2>&1; }

N="${TAG}_u"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"email\":\"$N@example.com\",\"password\":\"$PASS\"}"
TOK=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

echo "=== Import ishga tushadi ==="
BEFORE=$(q "SELECT count(*) FROM ctf_tasks")
OUT=$(cd "$ROOT" && pnpm --filter ./scripts run import-uz 2>&1)
echo "$OUT" | grep -qE "[0-9]+ inserted" || { fail "import chiqmadi: $(echo "$OUT" | tail -3)"; }
AFTER=$(q "SELECT count(*) FROM ctf_tasks")
EXPECTED=$(cd "$ROOT" && node -e "
const s=require('fs').readFileSync('scripts/src/content/uz-scenarios.ts','utf8');
console.log((s.match(/^  \{\$/gm)||[]).length);")
check "$((AFTER - BEFORE))" "$EXPECTED" "kontent faylidagi barcha topshiriq qo'shildi ($EXPECTED ta)"

echo
echo "=== ⭐ Hech qanday flag ochiq matnda saqlanmagan ==="
check "$(q "SELECT count(*) FROM ctf_tasks WHERE name='Metro Free WiFi' AND flag LIKE 'sha256\$%'")" "1" "flag sha256 bilan saqlangan"
check "$(q "SELECT count(*) FROM ctf_tasks WHERE flag LIKE 'cdCTF{%'")" "0" "bazada ochiq flag yo'q"

echo
echo "=== ⭐ Har uch tilda to'liq ==="
check "$(q "SELECT count(*) FROM ctf_tasks WHERE name IN ('Metro Free WiFi','The auditor''s token','A line of poetry')
            AND (name_uz IS NULL OR name_ru IS NULL OR description_uz IS NULL OR description_ru IS NULL)")" "0" "uz/ru tarjimalari bor"
check "$(q "SELECT count(*) FROM ctf_tasks WHERE name='Metro Free WiFi' AND hint_uz IS NOT NULL AND hint_ru IS NOT NULL")" "1" "maslahatlar ham tarjima qilingan"

echo
echo "=== ⭐ Hujjatlashtirilgan javoblar server tomonidan qabul qilinadi ==="
# The real check. Each flag below is the answer stated in the challenge text; if
# a puzzle and its flag ever drift apart, this fails.
challenge_id() { # SQL string literals escape a quote by doubling it.
  q "SELECT id FROM ctf_tasks WHERE name='${1//\'/\'\'}'"
}
try_flag() { # $1 challenge name, $2 flag, [$3 token] -> "True"/"False"
  local id; id=$(challenge_id "$1")
  [ -n "$id" ] || { echo "TOPILMADI"; return; }
  resetlimit
  curl -s -X POST $API/ctf/$id/submit -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${3:-$TOK}" -d "$(python3 -c "
import json,sys; print(json.dumps({'flag': sys.argv[1]}))" "$2")" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("correct"))'
}
check "$(try_flag 'Metro Free WiFi' 'cdCTF{10.44.3.254}')" "True" "Metro Free WiFi — /22 ning oxirgi hosti"
check "$(try_flag 'The stolen handset' 'cdCTF{359807064521235}')" "True" "O'g'irlangan telefon — Luhn nazorat raqami"
check "$(try_flag 'Chinor Telecom archive' 'cdCTF{chinor_telecom_arxivi_2026}')" "True" "Chinor Telecom — base64"
check "$(try_flag 'Registon bazaar cipher' 'cdCTF{registon_bozori_shifri}')" "True" "Registon — ROT13"
check "$(try_flag 'Anhor Bank response headers' 'cdCTF{anhor-bank-app-03.internal.uz}')" "True" "Anhor Bank — sarlavhadagi ichki host"
check "$(try_flag 'Night traffic on the Tashkent host' 'cdCTF{/old/config.php.bak}')" "True" "Tungi trafik — 404'lar orasidagi 200"
check "$(try_flag 'Where does the mail go' 'cdCTF{mx1.chinor-telecom.uz}')" "True" "MX — eng kichik prioritet"
check "$(try_flag 'A line of poetry' 'cdCTF{TOSHKENT}')" "True" "She'r — akrostix"
check "$(try_flag 'Zarafshon Logistics deploy directory' 'cdCTF{750_600}')" "True" "Ruxsatlar — sakkizlik"
check "$(try_flag "The auditor's token" 'cdCTF{jwt_payload_hech_qachon_maxfiy_emas}')" "True" "JWT payload"
check "$(try_flag 'One hash, ten words' 'cdCTF{chorsu2026}')" "True" "MD5 — lug'atdan"

echo
echo "--- noto'g'ri javob rad etiladi ---"
# A second account: submit returns correct:true for a challenge the caller has
# already solved, so the negative has to come from someone who has not.
N2="${TAG}_v"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N2\",\"email\":\"$N2@example.com\",\"password\":\"$PASS\"}"
TOK2=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N2\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
check "$(try_flag 'Metro Free WiFi' 'cdCTF{10.44.3.255}' "$TOK2")" "False" "broadcast manzili qabul qilinmaydi"

echo
echo "=== ⭐ Kategoriyalar amaliyot xaritasiga tushadi ==="
# A category the module↔practice map does not know about would make the pack
# invisible from the learning half — the whole point of the bridge.
for c in Networking Miscellaneous Crypto Recon Forensics Steganography Scripting Web; do
  n=$(q "SELECT count(*) FROM ctf_tasks WHERE category='$c'")
  [ "$n" -gt 0 ] || fail "$c kategoriyasida topshiriq yo'q"
done
grep -q '"Networking"' "$ROOT/artifacts/api-server/src/lib/practice-map.ts" && pass "kategoriyalar practice-map da mavjud" \
  || fail "practice-map kategoriyalarni bilmaydi"

echo
echo "=== ⭐ Qayta ishga tushirish takrorlamaydi ==="
(cd "$ROOT" && pnpm --filter ./scripts run import-uz > /dev/null 2>&1)
check "$(q "SELECT count(*) FROM ctf_tasks")" "$AFTER" "ikkinchi import qatorlar sonini o'zgartirmadi"

echo
echo "=== ⭐ --undo yechilgan topshiriqni o'chirmaydi ==="
# 'Metro Free WiFi' was solved above; the rest were solved too, so unsolve one
# deliberately and prove --undo treats the two cases differently.
UNSOLVED_ID=$(q "SELECT id FROM ctf_tasks WHERE name='A line of poetry'")
q "DELETE FROM ctf_attempts WHERE ctf_id=$UNSOLVED_ID" > /dev/null
SOLVED_ID=$(q "SELECT id FROM ctf_tasks WHERE name='Metro Free WiFi'")
(cd "$ROOT" && pnpm --filter ./scripts run import-uz -- --undo > /dev/null 2>&1)
check "$(q "SELECT count(*) FROM ctf_tasks WHERE id=$SOLVED_ID")" "1" "yechilgan topshiriq saqlanib qoldi"
check "$(q "SELECT count(*) FROM ctf_tasks WHERE id=$UNSOLVED_ID")" "0" "yechilmagani o'chirildi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 O'ZBEK KONTENT PAKETI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
