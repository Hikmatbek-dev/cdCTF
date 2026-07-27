#!/bin/bash
# robots.txt, sitemap.xml and the crawler previews — all of which are about
# links that have to resolve.
#
# The bug these guard against shipped and stayed live: every public URL the
# platform emitted was hardcoded to https://cdctf.uz, a domain that is not
# connected. The sitemap submitted to search engines was a list of dead links,
# and every shared preview had a dead og:image and a dead click-through.
#
# So the checks here are about the *origin*, not the markup: the URLs must
# follow the host the request came in on, must include rows that actually exist
# in the database, and must NOT follow a spoofed Host header — a canonical
# built from an attacker-controlled header is a cache-poisoning primitive.
#
# Run by run-all.sh, which supplies API_PORT and DATABASE_URL.
API=http://localhost:${API_PORT:-8099}
TAG="seo$RANDOM"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
check() { [ "$1" = "$2" ] && pass "$3" || fail "$3 — kutilgan '$2', kelgan '$1'"; }
contains() { case "$2" in *"$1"*) echo yes;; *) echo no;; esac; }
q() { psql "$DATABASE_URL" -tAqc "$1"; }
BOT="TelegramBot (like TwitterBot)"

ORIGIN="http://localhost:${API_PORT:-8099}"

echo "=== robots.txt ==="
R=$(curl -s $API/robots.txt)
check "$(curl -s -o /dev/null -w '%{http_code}' $API/robots.txt)" "200" "200 qaytadi"
check "$(contains "Sitemap: $ORIGIN/sitemap.xml" "$R")" "yes" "sitemap havolasi so'rov hostiga mos"
check "$(contains "cdctf.uz" "$R")" "no" "qotirilgan cdctf.uz yo'q"
check "$(contains "Disallow: /certificate/" "$R")" "yes" "sertifikatlar indekslanmaydi (shaxsiy ism bor)"

echo
echo "=== sitemap.xml ==="
CAT=$(q "INSERT INTO learn_categories (name) VALUES ('${TAG}_cat') RETURNING id")
MID=$(q "INSERT INTO modules (slug, title, description, category_id, pass_score, estimated_hours, is_published)
         VALUES ('${TAG}-slug','${TAG} Modul','tavsif',$CAT,80,10,true) RETURNING id")
CID=$(q "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, is_published)
         VALUES ('${TAG} Topshiriq','Bu topshiriq tavsifi','Web','easy',100,'sha256\$deadbeef',true) RETURNING id")
HID=$(q "INSERT INTO ctf_tasks (name, description, category, difficulty, points, flag, is_published)
         VALUES ('${TAG} Yashirin','x','Web','easy',100,'sha256\$deadbeef',false) RETURNING id")

S=$(curl -s $API/sitemap.xml)
check "$(curl -s -o /dev/null -w '%{http_code}' $API/sitemap.xml)" "200" "200 qaytadi"
check "$(contains "<loc>$ORIGIN/</loc>" "$S")" "yes" "bosh sahifa so'rov hostida"
check "$(contains "cdctf.uz" "$S")" "no" "o'lik domen yo'q"
check "$(contains "<loc>$ORIGIN/start</loc>" "$S")" "yes" "/start ro'yxatda"
echo "--- ⭐ bazadagi haqiqiy qatorlar chiqadi ---"
check "$(contains "<loc>$ORIGIN/modules/$MID</loc>" "$S")" "yes" "yangi modul sitemapda"
check "$(contains "<loc>$ORIGIN/ctf/$CID</loc>" "$S")" "yes" "yangi topshiriq sitemapda"
echo "--- ⭐ nashr qilinmagani chiqmaydi ---"
check "$(contains "<loc>$ORIGIN/ctf/$HID</loc>" "$S")" "no" "nashr qilinmagan topshiriq yashirin"

echo
echo "=== ⭐ Soxta Host sarlavhasiga ergashmaydi ==="
# Without the allowlist this would echo evil.example.com into every canonical.
E=$(curl -s -H "Host: evil.example.com" $API/sitemap.xml)
check "$(contains "evil.example.com" "$E")" "no" "soxta host aks ettirilmaydi"
check "$(contains "https://cdctf.uz/" "$E")" "yes" "tanilmagan host — brend domeniga qaytadi"

echo
echo "=== ⭐ Topshiriq preview'i haqiqiy nomni ko'rsatadi ==="
P=$(curl -s -A "$BOT" $API/ctf/$CID)
check "$(contains "${TAG} Topshiriq" "$P")" "yes" "og:title da topshiriq nomi"
check "$(contains "Bu topshiriq tavsifi" "$P")" "yes" "og:description da tavsif"
check "$(contains "og:url\" content=\"$ORIGIN/ctf/$CID\"" "$P")" "yes" "og:url so'rov hostida"
check "$(contains "og:image\" content=\"$ORIGIN/logo.png\"" "$P")" "yes" "og:image ishlaydigan hostda"

echo
echo "=== ⭐ Modul preview'i ==="
M=$(curl -s -A "$BOT" $API/modules/$MID)
check "$(contains "${TAG} Modul" "$M")" "yes" "og:title da modul nomi"
check "$(contains "og:url\" content=\"$ORIGIN/modules/$MID\"" "$M")" "yes" "og:url to'g'ri"

echo
echo "=== \"/\" bu yerda javob bermaydi (index.html javob beradi) ==="
# "/" is a real file in the static output, and Vercel serves the filesystem
# before rewrites — so no rule can ever route it here. A handler for it would be
# dead code that looks like a feature, which is exactly what it was until this
# was measured on the live site.
check "$(curl -s -o /dev/null -w '%{http_code}' -A "$BOT" $API/)" "404" "API '/' ni egallab olmaydi"

echo
echo "=== Mavjud bo'lmagan yozuv ham 200 qaytaradi (crawler 404 ni keshlaydi) ==="
check "$(curl -s -o /dev/null -w '%{http_code}' -A "$BOT" $API/ctf/99999999)" "200" "yo'q topshiriq — 200 + neytral preview"
check "$(contains "topilmadi" "$(curl -s -A "$BOT" $API/ctf/99999999)")" "yes" "matn 'topilmadi' deydi"

echo
[ -z "${FAILED:-}" ] && echo "🎉 SEO VA PREVIEW HAVOLALARI TO'G'RI" || echo "⚠️  BA'ZI SINOVLAR YIQILDI"
