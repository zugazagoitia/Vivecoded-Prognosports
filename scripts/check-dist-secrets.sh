#!/usr/bin/env bash
# Falla si dist/ contiene algo con forma de secreto (T13, requisitos §23.4). Uso: scripts/check-dist-secrets.sh [dir]
set -euo pipefail
dir="${1:-dist}"
[ -d "$dir" ] || { echo "::error::$dir no existe" >&2; exit 1; }
pattern='CLOUDFLARE_(API_TOKEN|ACCOUNT_ID)|SENTRY_AUTH_TOKEN|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|sntrys_[A-Za-z0-9]{20,}'
if grep -rEIl "$pattern" "$dir"; then
  echo "::error::dist/ contiene algo con forma de secreto" >&2
  exit 1
fi
echo "dist sin secretos: OK"
