#!/usr/bin/env bash
# Smoke test tras desplegar (T12): uso `scripts/smoke-deploy.sh <url-base>`.
# Comprueba estado y cabeceras de `/`, de una ruta profunda y de un asset con hash.
set -euo pipefail

base="${1:?uso: smoke-deploy.sh <url-base>}"
base="${base%/}"

fail() {
  echo "::error::smoke: $*" >&2
  exit 1
}

# Reintentos: el Worker recién desplegado puede tardar unos segundos en propagarse.
fetch() {
  local url="$1" out="$2"
  for _ in 1 2 3 4 5 6; do
    if curl -sS --max-time 20 -D "$out.h" -o "$out.b" "$url"; then
      if head -n1 "$out.h" | grep -q ' 200'; then return 0; fi
    fi
    sleep 5
  done
  return 1
}

header() { grep -i "^$2:" "$1" | tail -n1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fetch "$base/" "$tmp/root" || fail "GET / no devolvió 200"
grep -q '<div id="app"' "$tmp/root.b" || fail "GET / no devolvió index.html"
header "$tmp/root.h" cache-control | grep -qi 'no-cache' || fail "index.html sin Cache-Control no-cache"

fetch "$base/ranking/x/2026" "$tmp/deep" || fail "ruta profunda no devolvió 200"
grep -q '<div id="app"' "$tmp/deep.b" || fail "ruta profunda no devolvió index.html (fallback SPA)"

asset="$(grep -oE '/assets/[^"]+\.js' "$tmp/root.b" | head -n1 || true)"
[ -n "$asset" ] || fail "index.html no referencia ningún asset con hash"
fetch "$base$asset" "$tmp/asset" || fail "asset $asset no devolvió 200"
header "$tmp/asset.h" cache-control | grep -q 'immutable' || fail "asset sin Cache-Control immutable"

echo "smoke OK: $base"
