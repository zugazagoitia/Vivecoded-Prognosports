#!/usr/bin/env bash
# Regenera las capturas de referencia de Playwright en Linux (igual que CI).
# Las de macOS fallan en CI por fuentes y antialiasing: no las subas nunca.
#
# Uso: pnpm e2e:update:linux [ficheros o filtros de Playwright...]
#   (sin argumentos regenera todas las capturas cambiadas o ausentes de chromium y mobile)
# Requiere Docker en marcha (en macOS con OrbStack: `orbctl start`).
# La versión de la imagen debe coincidir con la de @playwright/test.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="mcr.microsoft.com/playwright:v1.64.0-noble"
PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"

docker run --rm --ipc=host \
  -v "$PWD":/work -w /work \
  -v prognosports-e2e-node-modules:/work/node_modules \
  -v prognosports-e2e-pnpm-store:/root/.local/share/pnpm \
  -e CI=1 -e VITE_GIT_SHA=e2e -e VITE_GIT_DATE=1970-01-01T00:00:00+00:00 \
  "$IMAGE" bash -c '
    set -euo pipefail
    npm i -g "pnpm@'"$PNPM_VERSION"'" >/dev/null
    pnpm install --frozen-lockfile --ignore-scripts
    pnpm build:e2e
    pnpm exec playwright test --project=chromium --project=mobile --update-snapshots=changed --retries=0 "$@"
  ' _ "$@"
