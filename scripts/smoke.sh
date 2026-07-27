#!/bin/bash
# Post-deploy smoke check — run this against production, every time.
#
# Two bugs lived on this site for months because nobody looked at the deployed
# result, only at the code:
#
#   1. A cron entry Vercel's Hobby plan rejects made every build fail silently.
#      Production kept serving the previous bundle for two days and said nothing.
#   2. The crawler rewrites pointed at a destination Vercel could not resolve,
#      so every link shared on Telegram or LinkedIn showed the same generic
#      preview — and the og:image and click-through pointed at cdctf.uz, a
#      domain that is not connected.
#
# Neither is visible from the code. Both are one request away. So: every check
# here is a request against the live site, and every one of them would have
# failed loudly on the day the bug shipped.
#
# Usage:
#   bash scripts/smoke.sh                       # checks https://cdctf.vercel.app
#   bash scripts/smoke.sh https://cdctf.uz      # or any deployment
#   EXPECT_BUNDLE=1 bash scripts/smoke.sh       # also assert the live bundle
#                                               # matches the local build
set -u
SITE="${1:-https://cdctf.vercel.app}"
SITE="${SITE%/}"
BOT="TelegramBot (like TwitterBot)"
ROOT=$(cd "$(dirname "$0")/.." && pwd)

FAILED=""
pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED="yes"; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
contains() { case "$2" in *"$1"*) echo yes;; *) echo no;; esac; }

echo "==> $SITE"
echo

echo "=== Sayt javob beryapti ==="
check "$(code "$SITE/")" "200" "bosh sahifa 200"
check "$(code "$SITE/api/stats")" "200" "API javob beryapti"

echo
echo "=== Deploy haqiqatan yangilanganmi ==="
LIVE_BUNDLE=$(curl -s --max-time 20 "$SITE/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
if [ -z "$LIVE_BUNDLE" ]; then
  fail "jonli bundle nomi topilmadi — bosh sahifa kutilganidek emas"
else
  pass "jonli bundle: $LIVE_BUNDLE"
  # The check that would have caught the silent cron failure: a build that never
  # landed leaves production on the previous bundle, and nothing else says so.
  LOCAL_BUNDLE=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$ROOT/artifacts/cyberplace/dist/public/index.html" 2>/dev/null | head -1)
  if [ -n "${EXPECT_BUNDLE:-}" ]; then
    if [ -z "$LOCAL_BUNDLE" ]; then
      fail "mahalliy build yo'q — avval 'pnpm run build' qiling"
    else
      check "$LIVE_BUNDLE" "$LOCAL_BUNDLE" "jonli bundle mahalliy build bilan bir xil"
    fi
  elif [ -n "$LOCAL_BUNDLE" ] && [ "$LIVE_BUNDLE" != "$LOCAL_BUNDLE" ]; then
    echo "  ⓘ  mahalliy build boshqacha ($LOCAL_BUNDLE) — deploy qilinmagan bo'lishi mumkin"
  fi
fi

echo
echo "=== robots.txt va sitemap jonli domenga ishora qiladimi ==="
ROBOTS=$(curl -s --max-time 20 "$SITE/robots.txt")
check "$(contains "Sitemap: $SITE/sitemap.xml" "$ROBOTS")" "yes" "robots.txt shu domenni ko'rsatadi"

SITEMAP=$(curl -s --max-time 20 "$SITE/sitemap.xml")
LOC_COUNT=$(printf '%s' "$SITEMAP" | grep -c "<loc>")
if [ "$LOC_COUNT" -lt 5 ]; then
  fail "sitemapda atigi $LOC_COUNT ta URL — generatsiya ishlamayapti"
else
  pass "sitemapda $LOC_COUNT ta URL"
fi
# Every <loc> must be on the host we just asked, or search engines are being
# handed links to somewhere else entirely.
STRAY=$(printf '%s' "$SITEMAP" | grep -oE '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' | grep -vc "^$SITE" || true)
check "$STRAY" "0" "hamma sitemap URL shu domenda"

# And they have to resolve. Three at random is enough to catch a dead domain.
BAD=0
for u in $(printf '%s' "$SITEMAP" | grep -oE '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' | head -3); do
  [ "$(code "$u")" = "200" ] || { echo "     ↳ $u"; BAD=$((BAD + 1)); }
done
check "$BAD" "0" "sitemapdagi havolalar ochiladi"

echo
echo "=== Ijtimoiy tarmoq preview'lari ==="
# The exact request Telegram makes. This is the check that was never run.
for path in / /talent /modules/1; do
  BODY=$(curl -s --max-time 20 -A "$BOT" "$SITE$path")
  OG_URL=$(printf '%s' "$BODY" | grep -oE '<meta property="og:url" content="[^"]*"' | sed 's/.*content="//;s/"$//' | head -1)
  if [ -z "$OG_URL" ]; then
    fail "$path — og:url yo'q (rewrite ishlamayapti?)"
  elif [ "${OG_URL#$SITE}" = "$OG_URL" ]; then
    fail "$path — og:url boshqa domenda: $OG_URL"
  else
    pass "$path — og:url $OG_URL"
  fi
done

# A preview whose image 404s renders as a grey box in every chat app.
OG_IMAGE=$(curl -s --max-time 20 -A "$BOT" "$SITE/talent" | grep -oE '<meta property="og:image" content="[^"]*"' | sed 's/.*content="//;s/"$//' | head -1)
if [ -z "$OG_IMAGE" ]; then
  fail "og:image yo'q"
else
  check "$(code "$OG_IMAGE")" "200" "og:image ochiladi ($OG_IMAGE)"
fi

# Distinct previews are the whole point: if two different pages produce the same
# title, the per-entity rewrites are falling through to index.html again.
T_HOME=$(curl -s --max-time 20 -A "$BOT" "$SITE/" | grep -oE '<meta property="og:title" content="[^"]*"' | head -1)
T_TALENT=$(curl -s --max-time 20 -A "$BOT" "$SITE/talent" | grep -oE '<meta property="og:title" content="[^"]*"' | head -1)
if [ -n "$T_HOME" ] && [ "$T_HOME" = "$T_TALENT" ]; then
  fail "bosh sahifa va /talent bir xil preview beradi — rewrite tushib qolgan"
else
  pass "har sahifa o'z preview'ini beradi"
fi

echo
echo "=== Odam SPA'ni oladi, stub emas ==="
HUMAN=$(curl -s --max-time 20 "$SITE/talent")
check "$(contains 'id="root"' "$HUMAN")" "yes" "brauzer haqiqiy ilovani oladi"

echo
if [ -n "$FAILED" ]; then
  echo "⚠️  DEPLOY MUAMMOLI — yuqoridagi ❌ larni tuzating"
  exit 1
fi
echo "🎉 JONLI SAYT SOG'LOM"
