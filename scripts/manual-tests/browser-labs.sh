#!/bin/bash
# Browser labs: the ones that work without a Docker host.
#
# /labs used to answer "not available" to every visitor, because the only kind
# of lab needed a runner on a machine nobody had provisioned. A browser lab runs
# in the learner's own tab, so the page works today — and this suite proves it
# end to end: the lab starts with no runner configured, the flag it hides is
# accepted by the paired challenge, and the container path stays gated.
#
# LAB_RUNNER_URL is deliberately unset for this suite: that is the state
# production is actually in.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}/api
PASS='Str0ng!Passw0rd'
TAG="blab$RANDOM"
ROOT=$(cd "$(dirname "$0")/../.." && pwd)

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }
resetlimit() { psql "$DATABASE_URL" -q -c "TRUNCATE rate_limits" >/dev/null 2>&1; }

N="${TAG}_u"
curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"email\":\"$N@example.com\",\"password\":\"$PASS\"}"
TOK=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"$N\",\"password\":\"$PASS\"}" | json token)
UID_=$(q "SELECT id FROM users WHERE nickname='$N'")
[ -n "$TOK" ] && pass "foydalanuvchi tayyor" || fail "login bo'lmadi"

echo
echo "=== Import skripti ishlaydi ==="
OUT=$(cd "$ROOT" && pnpm --filter ./scripts run import-labs 2>&1)
echo "$OUT" | grep -qE "labs inserted" || fail "import chiqmadi: $(echo "$OUT" | tail -3)"
check "$(q "SELECT count(*) FROM labs WHERE kind='browser' AND is_published")" "5" "5 ta brauzer laboratoriyasi qo'shildi"
check "$(q "SELECT count(*) FROM labs WHERE kind='browser' AND (browser_scenario IS NULL OR browser_scenario='')")" "0" "har birida stsenariy bor"
check "$(q "SELECT count(*) FROM labs WHERE kind='browser' AND ctf_id IS NULL")" "0" "har biri topshiriqqa bog'langan"

echo
echo "=== ⭐ Runner sozlanmagan, lekin sahifa ishlaydi ==="
# This is the whole point: LAB_RUNNER_URL is unset here, exactly as in prod.
L=$(curl -s $API/labs)
check "$(echo "$L" | json available)" "True" "available = true (runner yo'qligiga qaramay)"
check "$(echo "$L" | python3 -c '
import sys,json
d=json.load(sys.stdin)
print(sum(1 for l in d["labs"] if l["kind"]=="browser" and l["startable"]))')" "5" "5 tasi startable"
check "$(echo "$L" | python3 -c '
import sys,json
d=json.load(sys.stdin)
print(sum(1 for l in d["labs"] if l["kind"]=="container" and l["startable"]))')" "0" "konteynerli laboratoriyalar hali yopiq"

echo
echo "=== ⭐ Laboratoriya ishga tushadi va konteyner yaratilmaydi ==="
LID=$(q "SELECT id FROM labs WHERE slug='sql-login-bypass'")
resetlimit
R=$(curl -s -X POST $API/labs/$LID/start -H "Authorization: Bearer $TOK")
check "$(echo "$R" | json kind)" "browser" "javob kind=browser"
check "$(echo "$R" | json browserScenario)" "sql-login-bypass" "stsenariy uzatildi"
IID=$(echo "$R" | json id)
check "$(q "SELECT container_id LIKE 'browser:%' FROM lab_instances WHERE id=$IID")" "t" "sun'iy container_id — Docker'ga hech nima ketmadi"
check "$(q "SELECT host FROM lab_instances WHERE id=$IID")" "browser" "host=browser"

echo
echo "--- bir vaqtda faqat bitta ---"
L2=$(q "SELECT id FROM labs WHERE slug='idor-invoice'")
resetlimit
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/labs/$L2/start -H "Authorization: Bearer $TOK")" "409" "ikkinchisi rad etiladi"

echo
echo "--- to'xtatish ishlaydi ---"
check "$(curl -s -X POST $API/labs/instances/$IID/stop -H "Authorization: Bearer $TOK" | json stopped)" "True" "to'xtatildi"
check "$(q "SELECT status FROM lab_instances WHERE id=$IID")" "stopped" "bazada stopped"

echo
echo "=== ⭐ To'liq zanjir: start → tokenli nishon → solve → juftlangan topshiriq ==="
# The flag is no longer printed in the document. It is held server-side and
# released by /solve only after the exploit is proven, then submitted to the
# paired challenge. This drives that whole chain the way a learner does — one
# lab at a time, because only one instance may run per user.
#
# The `proof` for each scenario is exactly what its verify() checks; if a
# scenario and its challenge (or its engine) ever drift apart, a lab becomes
# unsolvable and one of these turns red.
solve_chain() { # $1 = slug, $2 = proof JSON -> prints only "correct" from the paired CTF
  # Only the final result reaches stdout: this runs inside $(...), so any check
  # printed here would be captured instead of shown, and any FAILED set here would
  # be lost with the subshell. The target's own guarantees are asserted in the
  # dedicated section below.
  local slug="$1" proof="$2" labid cid start iid tp token flag
  labid=$(q "SELECT id FROM labs WHERE slug='$slug'")
  cid=$(q "SELECT ctf_id FROM labs WHERE slug='$slug'")
  resetlimit
  start=$(curl -s -X POST "$API/labs/$labid/start" -H "Authorization: Bearer $TOK")
  iid=$(echo "$start" | json id)
  tp=$(echo "$start" | json targetPath)
  token="${tp#*?t=}"
  # Drive the exploit through the engine to get the server-held flag.
  flag=$(curl -s -X POST "$API/labs/solve" -H 'Content-Type: text/plain' \
    -d "$(python3 -c "import json,sys; print(json.dumps({'t': sys.argv[1], 'proof': json.loads(sys.argv[2])}))" "$token" "$proof")" | json flag)
  # Submit that flag to the paired challenge.
  resetlimit
  curl -s -X POST "$API/ctf/$cid/submit" -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOK" -d "$(python3 -c "import json,sys; print(json.dumps({'flag': sys.argv[1]}))" "$flag")" | json correct
  curl -s -o /dev/null -X POST "$API/labs/instances/$iid/stop" -H "Authorization: Bearer $TOK"
}
check "$(solve_chain sql-login-bypass '{"login":"admin'"'"' -- ","parol":"x"}')" "True" "SQL injection → flag → topshiriq"
check "$(solve_chain reflected-xss '{"q":"<img src=x onerror=getflag()>"}')" "True" "Reflected XSS → flag → topshiriq"
check "$(solve_chain idor-invoice '{"n":"1043-01"}')" "True" "IDOR → flag → topshiriq"
check "$(solve_chain cookie-role '{"role":"staff"}')" "True" "Cookie roli → flag → topshiriq"
check "$(solve_chain path-traversal '{"name":"../.env"}')" "True" "Path traversal → flag → topshiriq"

echo "--- noto'g'ri proof flag bermaydi ---"
resetlimit
BADLAB=$(q "SELECT id FROM labs WHERE slug='cookie-role'")
BADSTART=$(curl -s -X POST "$API/labs/$BADLAB/start" -H "Authorization: Bearer $TOK")
BADIID=$(echo "$BADSTART" | json id)
BADTP=$(echo "$BADSTART" | json targetPath); BADTOKEN="${BADTP#*?t=}"
check "$(curl -s -X POST "$API/labs/solve" -H 'Content-Type: text/plain' \
  -d "{\"t\":\"$BADTOKEN\",\"proof\":{\"role\":\"guest\"}}" | json flag)" "" "zaiflik ishlatilmasa flag yo'q"
curl -s -o /dev/null -X POST "$API/labs/instances/$BADIID/stop" -H "Authorization: Bearer $TOK"

echo
echo "=== ⭐ Stsenariy fayli va bazadagi flaglar mos ==="
# The scenario documents are the source of truth for what a learner will see.
# Compare them against what the importer stored, so the two cannot drift.
python3 - <<'PY'
import re, pathlib, hashlib, subprocess, os
src = pathlib.Path("lib/lab-scenarios/src/index.ts").read_text()
flags = sorted(set(re.findall(r"flag\{[a-z0-9_]+\}", src)))
print(f"  stsenariylarda topilgan flaglar: {len(flags)}")
bad = 0
for f in flags:
    h = "sha256$" + hashlib.sha256(f.encode()).hexdigest()
    n = subprocess.run(["psql", os.environ["DATABASE_URL"], "-tAqc",
                        f"SELECT count(*) FROM ctf_tasks WHERE flag='{h}'"],
                       capture_output=True, text=True).stdout.strip()
    if n != "1":
        print(f"  ❌ {f} bazada topilmadi (topildi: {n})"); bad += 1
if bad == 0:
    print("  ✅ har bir stsenariy flagi aynan bitta topshiriqqa mos")
PY

echo
echo "=== ⭐ Nishon hujjati o'z siyosati bilan, faqat tokenga beriladi ==="
# The documents used to be inlined into an iframe's srcdoc, and a srcdoc document
# inherits its parent's CSP — cdCTF's has no 'unsafe-inline' in script-src, so
# every lab rendered dead. Served from the API the document carries its own
# policy. And it was unauthenticated: anyone could curl the flag, and "Stop"
# changed nothing. Now the target answers only to a running instance's token.
resetlimit
GS=$(curl -s -X POST "$API/labs/$(q "SELECT id FROM labs WHERE slug='sql-login-bypass'")/start" -H "Authorization: Bearer $TOK")
GIID=$(echo "$GS" | json id)
GTP=$(echo "$GS" | json targetPath); GTOKEN="${GTP#*?t=}"
TARGET_CSP=$(curl -sI "$API/labs/target/sql-login-bypass?t=$GTOKEN" | tr -d '\r' | grep -i '^content-security-policy:')
check "$(curl -s -o /dev/null -w '%{http_code}' "$API/labs/target/sql-login-bypass?t=$GTOKEN")" "200" "tokenli nishon beriladi"
echo "$TARGET_CSP" | grep -q "sandbox allow-scripts" \
  && pass "sandbox allow-scripts — hujjat opaque originda" || fail "sandbox direktivi yo'q: $TARGET_CSP"
echo "$TARGET_CSP" | grep -q "allow-same-origin" \
  && fail "allow-same-origin BERILGAN — hujjat cdCTF originiga kira oladi!" || pass "allow-same-origin yo'q"
echo "$TARGET_CSP" | grep -q "script-src 'unsafe-inline'" \
  && pass "inline skript ruxsat etilgan (zaiflik shu)" || fail "inline skript bloklanadi — lab jonsiz bo'ladi"
echo "--- tokensiz kirib bo'lmaydi (flag oqib chiqmaydi) ---"
check "$(curl -s -o /dev/null -w '%{http_code}' "$API/labs/target/sql-login-bypass")" "403" "tokensiz nishon 403"
echo "--- boshqa labning tokeni bilan bu nishon ochilmaydi ---"
check "$(curl -s -o /dev/null -w '%{http_code}' "$API/labs/target/idor-invoice?t=$GTOKEN")" "403" "token faqat o'z stsenariysiga"
curl -s -o /dev/null -X POST "$API/labs/instances/$GIID/stop" -H "Authorization: Bearer $TOK"

echo "--- ilova sahifasining CSP'si nishonni freym qilishga ruxsat beradi ---"
# frame-src must allow 'self' now that the iframe has a src instead of srcdoc.
grep -q "frame-src 'self'" "$ROOT/vercel.json" \
  && pass "vercel.json frame-src 'self' bor" || fail "frame-src 'self' yo'q — iframe bloklanadi"

echo "--- ilovaning o'z script-src'i qattiq qolgan ---"
# The fix must not have been "add 'unsafe-inline' to the whole app".
grep -q "script-src 'self' https://challenges.cloudflare.com" "$ROOT/vercel.json" \
  && pass "ilova script-src'ida 'unsafe-inline' yo'q" || fail "ilova CSP'si bo'shashtirilgan!"

echo
echo "=== ⭐ Shriftlar o'z serverimizdan (CSP tashqi style-src'ga ruxsat bermaydi) ==="
# An href, not the word: the comment above the local <link> explains why the
# Google Fonts URL is gone, and naming it there is not the same as loading it.
grep -Eq 'href="https://fonts\.(googleapis|gstatic)\.com' "$ROOT/artifacts/cyberplace/index.html" \
  && fail "index.html hali Google Fonts'ni yuklaydi — CSP uni bloklaydi" || pass "tashqi shrift havolasi yo'q"
[ -f "$ROOT/artifacts/cyberplace/public/fonts/fonts.css" ] \
  && pass "mahalliy fonts.css bor" || fail "mahalliy fonts.css yo'q"
check "$(grep -c 'fonts.gstatic.com' "$ROOT/artifacts/cyberplace/public/fonts/fonts.css")" "0" "fonts.css ichida tashqi URL qolmagan"

echo
echo "=== ⭐ Nishon yangi oynada ochiladi, freymda emas ==="
# The target is a top-level document now, so isolation cannot rely on an iframe
# attribute — it comes from the response's own CSP, checked above. What is
# checked here is that nothing quietly re-inlines the document: a srcdoc would
# inherit the app's policy again and the labs would go dead a second time.
grep -rq "srcDoc" "$ROOT/artifacts/cyberplace/src" \
  && fail "srcDoc qaytib kelibdi — hujjat yana ilova CSP'sini meros qiladi" \
  || pass "srcDoc ishlatilmaydi"
grep -q 'target="_blank"' "$ROOT/artifacts/cyberplace/src/pages/LabsPage.tsx" \
  && pass "Boshlash tugmasi yangi oynada ochadi" || fail "target=_blank yo'q"
grep -q 'rel="noopener noreferrer"' "$ROOT/artifacts/cyberplace/src/pages/LabsPage.tsx" \
  && pass "noopener — nishon ochgan oynani boshqara olmaydi" || fail "noopener yo'q"

echo
[ -z "${FAILED:-}" ] && echo "🎉 BRAUZER LABORATORIYALARI ISHLAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
