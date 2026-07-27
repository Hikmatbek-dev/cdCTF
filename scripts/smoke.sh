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
#   EXPECT_STRING="Boshlanish nuqtangiz" bash scripts/smoke.sh
#       ↳ also assert the live JS bundle contains a string you just added, which
#         is how you prove the deploy actually landed
set -u
SITE="${1:-https://cdctf.vercel.app}"
SITE="${SITE%/}"
BOT="TelegramBot (like TwitterBot)"

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
  # Comparing this hash against a local build does not work: Vercel builds with
  # the project's own VITE_* variables, so the same source legitimately hashes
  # differently. Asserting a string only the new code contains does work, and it
  # is the check that would have caught the two days production spent quietly
  # serving the previous build.
  if [ -n "${EXPECT_STRING:-}" ]; then
    if curl -s --max-time 30 "$SITE/$LIVE_BUNDLE" | grep -qF "$EXPECT_STRING"; then
      pass "yangi kod jonli bundle ichida ('$EXPECT_STRING')"
    else
      fail "'$EXPECT_STRING' jonli bundle'da yo'q — deploy yetib bormagan"
    fi
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
for path in /talent /modules/1 /ctf/1; do
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

# "/" is a real file, so no rewrite can reach it — index.html answers every
# crawler. It must therefore carry NO absolute og:url, or the preview links
# wherever that string happens to point rather than where the reader is.
HOME_OG_URL=$(curl -s --max-time 20 -A "$BOT" "$SITE/" | grep -oE '<meta property="og:url" content="[^"]*"' | sed 's/.*content="//;s/"$//' | head -1)
if [ -z "$HOME_OG_URL" ]; then
  pass "/ — og:url yo'q, crawler o'zi ochgan URL'ni ishlatadi"
elif [ "${HOME_OG_URL#$SITE}" = "$HOME_OG_URL" ]; then
  fail "/ — og:url boshqa domenda: $HOME_OG_URL"
else
  pass "/ — og:url $HOME_OG_URL"
fi

# A preview whose image 404s renders as a grey box in every chat app.
OG_IMAGE=$(curl -s --max-time 20 -A "$BOT" "$SITE/talent" | grep -oE '<meta property="og:image" content="[^"]*"' | sed 's/.*content="//;s/"$//' | head -1)
if [ -z "$OG_IMAGE" ]; then
  fail "og:image yo'q"
else
  check "$(code "$OG_IMAGE")" "200" "og:image ochiladi ($OG_IMAGE)"
fi

# Distinct previews are the whole point: if two different pages produce the same
# title, the per-entity rewrites are falling through to index.html again.
og_title() { curl -s --max-time 20 -A "$BOT" "$1" | grep -oE '<meta property="og:title" content="[^"]*"' | head -1; }
T_HOME=$(og_title "$SITE/")
T_TALENT=$(og_title "$SITE/talent")
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
