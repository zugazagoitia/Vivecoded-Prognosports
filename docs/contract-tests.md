# Pruebas de contrato contra la API v2 (T15)

Dos herramientas independientes de `pnpm test`/CI de la app. Ninguna hace peticiones de escritura ni inicia sesión.

## 1. Diff de especificación

```sh
pnpm api:drift            # compara https://api.prognosports.com/openapi con api/openapi.json
pnpm api:drift --update   # además sobrescribe api/openapi.json con la versión publicada
```

Comparación semántica (orden de claves y de listas escalares ignorado). Salida: `0` sin cambios, `1` deriva (lista los cambios, los potencialmente incompatibles marcados `BREAKING?`), `2` no se pudo descargar la spec (red; no es un cambio de contrato). En GitHub Actions escribe `title`, `breaking` y `changes` en `$GITHUB_OUTPUT`.

Job programado (lo cablea T11; no hay workflow en este issue): diario (`cron`) y manual (`workflow_dispatch`):

1. `pnpm api:drift --update`; si sale `1`:
2. `pnpm api:types` (regenera `src/api/schema.d.ts`).
3. Abrir una PR con `api/openapi.json` + `schema.d.ts`, con el `title` de la salida (incluir `BREAKING` si `breaking=true`).

Si sale `2`, reintentar al día siguiente: no abrir PR.

## 2. Suite de contrato en vivo

```sh
pnpm test:contract
```

Config propia (`vitest.contract.config.ts`), tests en `src/api/contract/*.contract.ts` (no coinciden con `*.test.ts`, así que `pnpm test` no los ejecuta). Usa los envoltorios reales de `src/api` y valida con los esquemas Zod; ante un desajuste el mensaje nombra el esquema, la ruta y cada campo. Reintenta con backoff errores de red/timeout/5xx; si persisten falla con `[network]` (distinto de `[contract]`).

Temporada de referencia (`src/api/contract/harness.ts`, sobrescribible con `CONTRACT_COMPETITION`, `CONTRACT_SEASON`, `CONTRACT_GRAND_PRIX`, `CONTRACT_SESSION`, `CONTRACT_COMMUNITY`, `CONTRACT_API_BASE_URL`): competición 1 (F1), temporada 9 (2026), GP 3 (Australia, ya disputado), sesión 2 (carrera), comunidad 1 (PrognoSports, abierta).

### Alcance: endpoints públicos (sondeados sin token el 2026-10-10)

Públicos (cubiertos en `public.contract.ts`): `gps`, `gps/{competition}/next`, `gps/{competition}/{season}`, `gps/{id}`, `.../{gp}/drivers`, `.../{gp}/sessions`, `.../sessions/{session}`, `sessions`, `circuits/`, `seasons/{season}/circuits`, `drivers`, `constructors/`, `rulesets/`, `competitions/`, `seasons/`, `seasons/current/{competition}`, `seasons/{season}/`, `communities`, `communities/{id}`, `timezones`.

Requieren token (la API responde HTTP 200 con `success:false` y "No autorizado"): `.../sessions/{session}/grid`, `.../results`, `communities/.../points`, `.../totaluserpoints`, `communities/{id}/members`, `user/**` (incluido `resume`), `notifications/**`, `competitions/{id}/seasons`. Se prueban en `auth.contract.ts` solo si existe `CONTRACT_TEST_TOKEN` (cuenta dedicada de solo lectura, miembro de `CONTRACT_COMMUNITY`); si no, se omiten. Cubren también la forma real de `tipps` (mapa por usuario), `calculations`, `members` y `usages`. Para un backend local: `CONTRACT_API_BASE_URL=http://localhost:8001 CONTRACT_COMMUNITY=<id> CONTRACT_TEST_TOKEN=<token> pnpm test:contract`. En CI esas rutas quedan cubiertas por MSW.

`corrections.contract.ts` vigila las discrepancias de §24.7 y el comportamiento real que el cliente rodea (sesión caducada = HTTP 200, ruta de reglas sin GP inexistente): pasa mientras sigan existiendo y falla con instrucciones cuando la API las corrija (p. ej. si aparece `standingsByHits`).

Programarla: igual que el diff, en un job diario/manual con `pnpm test:contract` (sin secretos; opcionalmente `CONTRACT_TEST_TOKEN` desde un secreto).
