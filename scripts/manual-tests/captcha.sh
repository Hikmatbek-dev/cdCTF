#!/bin/bash
# Turnstile actually gates registration when it is turned on.
#
# Every piece existed and none of it was connected: the widget was written but
# never imported, so the frontend sent no token; TURNSTILE_ENFORCE defaults off,
# so a missing token was accepted anyway; and none of the env vars appeared in
# .env.example, so there was nothing to tell you to set them. Each part looked
# done on its own. Together they were a captcha that never ran.
#
# Config lives in captcha.env — enforced, with Cloudflare's "always passes"
# test secret. See captcha-failclosed.sh for the misconfigured case.
API=http://localhost:${API_PORT:-8099}/api

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

N="cap$RANDOM$RANDOM"
body() { echo "{\"nickname\":\"$1\",\"email\":\"$1@e.com\",\"password\":\"Abcdefgh1!\"${2:-}}"; }
reg() {
  curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/register \
    -H 'Content-Type: application/json' -d "$1"
}

echo "=== ⭐ Yoqilganda tokensiz ro'yxatdan o'tish RAD ETILADI ==="
check "$(reg "$(body ${N}a)")" "400" "tokensiz rad etildi"

MSG=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d "$(body ${N}b)" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("error",""))')
echo "  → $MSG"
echo "$MSG" | grep -qi "captcha" && pass "xabar sababni aytadi" || fail "xabar tushunarsiz: $MSG"

echo
echo "=== Bo'sh token yetishmayotgani bilan bir xil (probel token emas) ==="
check "$(reg "$(body ${N}c ',"captchaToken":"   "')")" "400" "probeldan iborat token rad etildi"

echo
echo "=== ⭐ Butun zanjir ulangan: token → server → Cloudflare → qabul ==="
# Not "does it reject" but "does it ever accept" — a check that only ever says
# no would pass every case above while blocking all registration.
check "$(reg "$(body ${N}d ',"captchaToken":"dummy-token"')")" "201" "token bilan ro'yxatdan o'tish ISHLAYDI"

echo
[ -z "$FAILED" ] && echo "🎉 CAPTCHA HAQIQATAN HIMOYA QILADI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
