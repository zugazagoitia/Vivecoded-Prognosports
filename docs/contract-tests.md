# Pruebas de contrato contra la API v2

Dos herramientas independientes de `pnpm test` y de CI. Ninguna hace peticiones de escritura; la suite en vivo solo inicia sesión si le pasas un token. Complementan las fixtures de los tests ([`testing.md`](testing.md)), que deben tener la forma real de la API.

## 1. Diff de especificación

```sh
pnpm api:drift            # compara https://api.prognosports.com/openapi con api/openapi.json
pnpm api:drift --update   # además sobrescribe api/openapi.json con la versión publicada
```

Comparación semántica (orden de claves y de listas escalares ignorado). Salida: `0` sin cambios, `1` deriva (lista los cambios, los potencialmente incompatibles marcados `BREAKING?`), `2` no se pudo descargar la spec (red; no es un cambio de contrato). En GitHub Actions escribe `title`, `breaking` y `changes` en `$GITHUB_OUTPUT`.

**Programación (no cableada todavía: hoy no existe un workflow, se ejecuta a mano)**. Propuesta de job diario (`cron`) y manual (`workflow_dispatch`):

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

### Alcance: endpoints públicos (sondeados sin token el 2026-10-10; reverifica con `pnpm test:contract`)

Públicos (cubiertos en `public.contract.ts`): `gps`, `gps/{competition}/next`, `gps/{competition}/{season}`, `gps/{id}`, `.../{gp}/drivers`, `.../{gp}/sessions`, `.../sessions/{session}`, `sessions`, `circuits/`, `seasons/{season}/circuits`, `drivers`, `constructors/`, `rulesets/`, `competitions/`, `seasons/`, `seasons/current/{competition}`, `seasons/{season}/`, `communities`, `communities/{id}`, `timezones`.

Requieren token (la API responde HTTP 200 con `success:false` y "No autorizado"): `.../sessions/{session}/grid`, `.../results`, `communities/.../points`, `.../totaluserpoints`, `communities/{id}/members`, `user/**` (incluido `resume`), `notifications/**`, `competitions/{id}/seasons`. Se prueban en `auth.contract.ts` solo si existe `CONTRACT_TEST_TOKEN` (cuenta dedicada de solo lectura, miembro de `CONTRACT_COMMUNITY`); si no, se omiten. Cubren también la forma real de `tipps` (mapa por usuario), `calculations`, `members` y `usages`. Para un backend local: `CONTRACT_API_BASE_URL=http://localhost:8001 CONTRACT_COMMUNITY=<id> CONTRACT_TEST_TOKEN=<token> pnpm test:contract`. En CI esas rutas quedan cubiertas por MSW.

`corrections.contract.ts` vigila las discrepancias de §24.7 y el comportamiento real que el cliente rodea (sesión caducada = HTTP 200, ruta de reglas sin GP inexistente): pasa mientras sigan existiendo y falla con instrucciones cuando la API las corrija (p. ej. si aparece `standingsByHits`).

Programarla (pendiente, igual que el diff): job diario/manual con `pnpm test:contract` (sin secretos; opcionalmente `CONTRACT_TEST_TOKEN` desde un secreto). Para un backend propio sin secretos del proyecto: [`local-backend.md`](local-backend.md).

## 3. Qué hacer cuando falla

- `[contract]` en `corrections.contract.ts`: el backend ha corregido una discrepancia. Sigue las instrucciones del mensaje, quita el workaround del cliente y actualiza «Discrepancias» en [`src/api/README.md`](../src/api/README.md).
- `[contract]` en otros ficheros: la API ha cambiado o el esquema Zod es incorrecto. Acepta ambas formas en `src/api/schemas.ts`, actualiza fixtures y mocks y, si es un fallo del backend, repórtalo (procedimiento en [`AGENTS.md`](../AGENTS.md#reportar-problemas-del-backend-o-del-contrato-de-la-api)).
- `[network]`: caída o red; no es un cambio de contrato.
- `pnpm api:drift` sale `1`: la spec publicada cambió; revisa los `BREAKING?` y regenera con `--update` y `pnpm api:types`.
