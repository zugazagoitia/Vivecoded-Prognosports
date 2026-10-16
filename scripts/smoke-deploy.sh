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

# Reintentos: el Worker recién desplegado puede tardar unos segundos en propagarse. Si se pasa un
# patrón, también se reintenta cuando la respuesta es 200 pero aún no contiene ese texto (la primera
# versión de un Worker nuevo puede responder vacío justo después de subirla).
fetch() {
  local url="$1" out="$2" pattern="${3:-}"
  for _ in 1 2 3 4 5 6; do
    if curl -sS --max-time 20 -D "$out.h" -o "$out.b" "$url"; then
      if head -n1 "$out.h" | grep -q ' 200'; then
        if [ -z "$pattern" ] || grep -q "$pattern" "$out.b"; then return 0; fi
      fi
    fi
    sleep 5
  done
  return 1
}

header() { grep -i "^$2:" "$1" | tail -n1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fetch "$base/" "$tmp/root" '<div id="app"' || fail "GET / no devolvió 200 con index.html"
header "$tmp/root.h" cache-control | grep -qi 'no-cache' || fail "index.html sin Cache-Control no-cache"

for h in content-security-policy strict-transport-security x-content-type-options referrer-policy permissions-policy cross-origin-opener-policy; do
  header "$tmp/root.h" "$h" | grep -q . || fail "/ sin cabecera $h"
done
csp="$(header "$tmp/root.h" content-security-policy)"
echo "$csp" | grep -q "frame-ancestors 'none'" || fail "CSP sin frame-ancestors 'none'"
if echo "$csp" | grep -qE 'unsafe-(inline|eval)'; then fail "CSP con unsafe-inline/unsafe-eval"; fi

fetch "$base/ranking/x/2026" "$tmp/deep" '<div id="app"' || fail "ruta profunda no devolvió 200 con index.html (fallback SPA)"

header "$tmp/deep.h" content-security-policy | grep -q . || fail "ruta profunda sin CSP"

asset="$(grep -oE '/assets/[^"]+\.js' "$tmp/root.b" | head -n1 || true)"
[ -n "$asset" ] || fail "index.html no referencia ningún asset con hash"
fetch "$base$asset" "$tmp/asset" || fail "asset $asset no devolvió 200"
header "$tmp/asset.h" cache-control | grep -q 'immutable' || fail "asset sin Cache-Control immutable"

echo "smoke OK: $base"
