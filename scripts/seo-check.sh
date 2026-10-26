#!/usr/bin/env bash

set -euo pipefail

D="https://jevailab.com"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

chk() {
  printf "%-40s %s\n" "$1" "$(curl -sS -o /dev/null -w '%{http_code}' "$2")"
}

chk "/create"                    "$D/create"
chk "/zh/create"                 "$D/zh/create"
chk "/launch-pricing"            "$D/launch-pricing"
chk "/ai (应 301)"               "$D/ai"
chk "/blog/hello-world (应 301)" "$D/blog/hello-world"
chk "/sitemap.xml"               "$D/sitemap.xml"

echo "--- sitemap 检查 ---"
curl -sS "$D/sitemap.xml" > "$TMP_FILE"
count_matches() {
  grep -c "$1" "$TMP_FILE" || true
}

echo "loc 条数: $(count_matches '<loc>')"
echo "/create 命中: $(count_matches '/create')"
echo "定价页命中: $(count_matches 'launch-pricing')"
echo "站务页残留: $(count_matches -E 'terms|privacy|cookie|changelog|roadmap')  应为 0"
echo "changefreq 残留: $(count_matches 'changefreq')  应为 0"

echo "--- SSR 检查（不执行 JS 能不能读到正文）---"
# The workspace copy changed from the old upload label to "Create your image";
# keep both markers so this check remains useful across the transition.
curl -sS "$D/create" | grep -Ec "Upload a reference image|Create your image" || true

echo "--- AI 爬虫可达 ---"
for UA in "GPTBot/1.0" "OAI-SearchBot/1.0" "PerplexityBot/1.0"; do
  echo -n "$UA -> "
  curl -A "Mozilla/5.0 (compatible; $UA)" -sS -o /dev/null -w "%{http_code}\n" "$D/"
done
