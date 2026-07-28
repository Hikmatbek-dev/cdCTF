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
echo "=== ⭐ Har bir laboratoriyaning flagi juftlangan topshiriq tomonidan qabul qilinadi ==="
# The flags are the ones the scenario documents actually print. If a scenario
# and its challenge ever drift apart, the lab becomes unsolvable — and this is
# what notices.
try_flag() { # $1 = lab slug, $2 = flag
  local cid; cid=$(q "SELECT ctf_id FROM labs WHERE slug='$1'")
  resetlimit
  curl -s -X POST $API/ctf/$cid/submit -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOK" -d "$(python3 -c "
import json,sys; print(json.dumps({'flag': sys.argv[1]}))" "$2")" | json correct
}
check "$(try_flag sql-login-bypass 'flag{sql_1nj3ct10n_ch1n0r}')" "True" "SQL injection"
check "$(try_flag reflected-xss 'flag{xss_r3fl3ct3d_r3g1st0n}')" "True" "Reflected XSS"
check "$(try_flag idor-invoice 'flag{1d0r_h1sob_1043}')" "True" "IDOR"
check "$(try_flag cookie-role 'flag{c00k13_r0l3_s4rd0b4}')" "True" "Cookie roli"
check "$(try_flag path-traversal 'flag{tr4v3rs4l_r3g1st0n_env}')" "True" "Path traversal"

echo
echo "=== ⭐ Stsenariy fayli va bazadagi flaglar mos ==="
# The scenario documents are the source of truth for what a learner will see.
# Compare them against what the importer stored, so the two cannot drift.
python3 - <<'PY'
import re, pathlib, hashlib, subprocess, os
src = pathlib.Path("artifacts/cyberplace/src/components/labs/scenarios.ts").read_text()
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
echo "=== ⭐ Sandbox atributi to'g'ri ==="
# allow-same-origin next to allow-scripts would let the deliberately vulnerable
# document read cdCTF's own origin. That must never be added.
SB=$(grep -o 'sandbox="[^"]*"' "$ROOT/artifacts/cyberplace/src/components/labs/BrowserLab.tsx")
echo "$SB" | grep -q "allow-scripts" && pass "allow-scripts bor (zaiflik ishlashi kerak)" || fail "allow-scripts yo'q"
echo "$SB" | grep -q "allow-same-origin" && fail "allow-same-origin QO'SHILGAN — sandbox buzilgan!" || pass "allow-same-origin yo'q — origin ajratilgan"

echo
[ -z "${FAILED:-}" ] && echo "🎉 BRAUZER LABORATORIYALARI ISHLAYDI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
