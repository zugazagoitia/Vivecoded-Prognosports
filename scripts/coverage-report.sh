#!/usr/bin/env bash
# Informe de cobertura: resumen del job y comentario único en la PR (marcador oculto).
# Delta frente al último run correcto de CI en la rama base (artefacto `coverage`). Solo `gh` y `jq`.
set -euo pipefail

CUR=coverage/coverage-summary.json
MARK='<!-- coverage-report -->'
TMP="${RUNNER_TEMP:-/tmp}/base-cov"
[ -f "$CUR" ] || { echo "Sin $CUR; nada que informar."; exit 0; }

BASE=null
if run=$(gh run list -R "$REPO" -w ci.yml -b "$BASE_BRANCH" -s success -L 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null) && [ -n "$run" ]; then
  mkdir -p "$TMP"
  if gh run download "$run" -R "$REPO" -n coverage -D "$TMP" >/dev/null 2>&1 && [ -f "$TMP/coverage-summary.json" ]; then
    BASE=$(cat "$TMP/coverage-summary.json")
  fi
fi

body=$(jq -r --argjson B "$BASE" --arg mark "$MARK" --arg bb "$BASE_BRANCH" '
  def f: (. * 100 | round / 100 | tostring) + "%";
  . as $cur
  | def delta($k): if $B == null then "" else
      ($cur.total[$k].pct - $B.total[$k].pct) as $x
      | " (" + (if $x > 0 then "+" else "" end) + ($x * 100 | round / 100 | tostring) + ")" end;
  $mark + "\n### Cobertura de tests (informe de respaldo)\n\n| Métrica | Total" + (if $B == null then "" else " (Δ vs `" + $bb + "`)" end) + " |\n|---|---|\n"
  + ([["Líneas","lines"],["Ramas","branches"],["Funciones","functions"],["Sentencias","statements"]]
     | map("| " + .[0] + " | " + ($cur.total[.[1]].pct | f) + delta(.[1]) + " |") | join("\n"))
  + "\n\n<details><summary>Por carpeta</summary>\n\n| Carpeta | Líneas | Ramas |\n|---|---|---|\n"
  + ([$cur | to_entries[] | select(.key != "total")
      | {d: (.key | sub("^.*/(?<r>(src|scripts)/)"; .r) | sub("/[^/]*$"; "")), v: .value}]
     | group_by(.d) | map({d: .[0].d,
         l: ((map(.v.lines.covered) | add) / ((map(.v.lines.total) | add) | if . == 0 then 1 else . end) * 100),
         b: ((map(.v.branches.covered) | add) / ((map(.v.branches.total) | add) | if . == 0 then 1 else . end) * 100)})
     | map("| `" + .d + "` | " + (.l | f) + " | " + (.b | f) + " |") | join("\n"))
  + "\n\n</details>\n\nGenerado por el job `coverage` de CI. La subida nativa a GitHub Code Quality es independiente (docs/ci.md#cobertura)."
' "$CUR")

printf '%s\n' "$body" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"

if [ -n "${PR_NUMBER:-}" ]; then
  id=$(gh api "repos/$REPO/issues/$PR_NUMBER/comments" --paginate \
    --jq "map(select(.body | contains(\"$MARK\"))) | .[0].id // empty")
  if [ -n "$id" ]; then
    gh api -X PATCH "repos/$REPO/issues/comments/$id" -f body="$body" >/dev/null
  else
    gh pr comment "$PR_NUMBER" -R "$REPO" --body "$body" >/dev/null
  fi
fi
