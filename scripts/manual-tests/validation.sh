#!/bin/bash
# Register and login validate against schemas generated from the OpenAPI spec.
#
# The rule that matters: the spec said a password needed 6 characters while the
# server demanded 10 and four character classes, and nothing noticed. Wiring the
# generated validator as it stood would have quietly weakened registration —
# so these cases pin the strong rule, from the spec's side.
API=http://localhost:${API_PORT:-8099}/api

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan $2, kelgan $1"; }

reg() { # $1 = json body -> http code
  curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/register \
    -H 'Content-Type: application/json' -d "$1"
}
regbody() {
  curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d "$1"
}

N="val$RANDOM$RANDOM"

echo "=== ⭐ Parol qoidasi ZAIFLASHMADI (spec 6 derdi, server 10 talab qiladi) ==="
check "$(reg "{\"nickname\":\"${N}a\",\"email\":\"${N}a@e.com\",\"password\":\"Ab1!xy\"}")" "400" "6 belgili parol RAD ETILDI"
check "$(reg "{\"nickname\":\"${N}b\",\"email\":\"${N}b@e.com\",\"password\":\"Abcdefgh1!\"}")" "201" "10 belgili to'liq parol qabul qilindi"

echo
echo "=== Har bir belgi sinfi talab qilinadi ==="
check "$(reg "{\"nickname\":\"${N}c\",\"email\":\"${N}c@e.com\",\"password\":\"abcdefghij1!\"}")" "400" "katta harfsiz rad etildi"
check "$(reg "{\"nickname\":\"${N}d\",\"email\":\"${N}d@e.com\",\"password\":\"ABCDEFGHIJ1!\"}")" "400" "kichik harfsiz rad etildi"
check "$(reg "{\"nickname\":\"${N}e\",\"email\":\"${N}e@e.com\",\"password\":\"Abcdefghij!\"}")" "400" "raqamsiz rad etildi"
check "$(reg "{\"nickname\":\"${N}f\",\"email\":\"${N}f@e.com\",\"password\":\"Abcdefghij1\"}")" "400" "belgisiz rad etildi"

echo
echo "=== Nickname qoidasi ==="
check "$(reg "{\"nickname\":\"ab\",\"email\":\"${N}g@e.com\",\"password\":\"Abcdefgh1!\"}")" "400" "3 belgidan qisqa rad etildi"
check "$(reg "{\"nickname\":\"${N}-bad\",\"email\":\"${N}h@e.com\",\"password\":\"Abcdefgh1!\"}")" "400" "chiziqcha rad etildi (faqat harf/raqam/pastki chiziq)"
check "$(reg "{\"nickname\":\"$(printf 'a%.0s' {1..40})\",\"email\":\"${N}i@e.com\",\"password\":\"Abcdefgh1!\"}")" "400" "32 belgidan uzun rad etildi"

echo
echo "=== Email qoidasi ==="
check "$(reg "{\"nickname\":\"${N}j\",\"email\":\"emas-email\",\"password\":\"Abcdefgh1!\"}")" "400" "noto'g'ri email rad etildi"

echo
echo "=== Yetishmayotgan va noto'g'ri tipdagi maydonlar ==="
check "$(reg "{\"nickname\":\"${N}k\"}")" "400" "email/parolsiz rad etildi"
check "$(reg "{\"nickname\":123,\"email\":\"${N}l@e.com\",\"password\":\"Abcdefgh1!\"}")" "400" "raqam nickname rad etildi"
check "$(reg '{}')" "400" "bo'sh body rad etildi"
check "$(reg 'null')" "400" "null body rad etildi"

echo
echo "=== Xato xabari maydonni nomlaydi ==="
MSG=$(regbody "{\"nickname\":\"${N}m\",\"email\":\"${N}m@e.com\",\"password\":\"qisqa\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("error",""))')
echo "  → $MSG"
echo "$MSG" | grep -qi "password" && pass "xabar qaysi maydon ekanini aytadi" || fail "xabar tushunarsiz: $MSG"

echo
echo "=== Login validatsiyasi ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"nickname":"x"}')" "400" "parolsiz rad etildi"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"nickname":"x","password":"y"}')" "401" "to'liq body → 401 (validatsiya o'tdi, hisob yo'q)"

echo
echo "=== ⭐ captchaToken OLIB TASHLANMAYDI (zod noma'lum maydonni yo'q qiladi) ==="
# The validator strips fields it does not know. captchaToken was not in the spec,
# so wiring this would have silently disabled Turnstile with nothing failing.
check "$(reg "{\"nickname\":\"${N}n\",\"email\":\"${N}n@e.com\",\"password\":\"Abcdefgh1!\",\"captchaToken\":\"dummy\"}")" "201" "captchaToken bilan ro'yxatdan o'tish ishlaydi"

echo
[ -z "$FAILED" ] && echo "🎉 VALIDATSIYA SPEC'DAN KELADI VA KUCHLI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
