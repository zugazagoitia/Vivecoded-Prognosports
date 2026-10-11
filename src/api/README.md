# Capa de acceso a la API v2

Única vía de acceso al backend. Ninguna pantalla importa `fetch`; se usan estas funciones desde las queries (T4).

- `client.ts`: cliente `fetch` propio (ver decisión abajo). Desenvuelve `ApiResponse` y devuelve solo `result`; convierte errores a `ApiError`; timeout (15 s) y `AbortSignal`.
- `schemas.ts`: esquemas Zod de las respuestas críticas. `User` nunca contiene `hashedPassword` (se descarta al parsear).
- `events.ts`: `onSessionExpired` (401, lo consume T3/T4) y `onContractError` (para T14).
- `config.ts`: formato del header de autenticación en un único sitio (`Authorization: Bearer <token>`, según `securitySchemes.BearerAuth` de la especificación; pendiente de confirmar con el backend).
- `schema.d.ts`: tipos generados con `pnpm api:types` desde `api/openapi.json` (copia versionada). `pnpm api:types:fetch` actualiza la copia desde `https://api.prognosports.com/openapi`.
- El store de sesión (T4) debe llamar a `setTokenProvider(() => token)`.

## Decisión: cliente propio frente a `openapi-fetch`

Se usa `fetch` propio. La especificación casi no marca campos como obligatorios y tipa el envelope como `object`, así que `openapi-fetch` aportaría poca seguridad de tipos; además hay que corregir rutas que la spec describe mal (abajo), desenvolver el envelope y validar con Zod. Los tipos generados quedan disponibles para consulta (`schema.d.ts`).

## Discrepancias con la especificación (§24.7)

1. Regeneración de invitación: la spec dice `POST /v2/communities/{community}/recretate`; el cliente usa `recreate` (`INVITATION_RECREATE_SEGMENT` en `communities.ts`; por confirmar contra el backend real).
2. Parrilla: la spec dice `/gps/{c}/{s}/{gp}/{session}/grid`; se usa `/gps/{c}/{s}/{gp}/sessions/{session}/grid`.
3. `PUT /gps/.../sessions`: la spec declara el parámetro `session` sin que esté en la ruta; se usa `PUT .../sessions/{session}`.
4. `UserPoints`: el backend envía `stadingsByHits` / `previousStadingsByHits`; el modelo de dominio expone `standingsByHits` / `previousStandingsByHits` (mapeo en `UserPointsSchema`).

5. `Community`: la API real envía `members_amount` y `user_is_member` (snake_case; la spec dice camelCase) y `GET /communities/{id}` no incluye `id`. `CommunitySchema` acepta ambas formas y normaliza al modelo camelCase (`membersAmount`, `userIsMember`); `getCommunity` rellena `id` con el solicitado (`CommunityDetailSchema`).
6. `RuleSet`: la API real envía `isPublic` (la spec dice `public`); se acepta cualquiera de las dos y el modelo expone `public`. `data.pointsByEqualsPosition` es `{ [sesión]: { [posición]: puntos } }` (objetos anidados, no números).
7. `GrandPrix`: `/gps` y `/gps/{id}` no envían `round` (solo el listado por temporada), por lo que es opcional. Esas respuestas solo traen `id`, `name` y `code`.

## URL base

`VITE_API_BASE_URL` es solo el origen (`https://api.prognosports.com`, sin `/v2`): las rutas de los envoltorios ya empiezan por `/v2` (igual que en la spec). La validación de entorno rechaza una URL que termine en `/v2` (evita peticiones a `/v2/v2/...`). Los mocks (MSW y `e2e/support/api.ts`) interceptan `*/v2/**` y no dependen del origen.

Además: la spec describe las respuestas sin envelope y el login como `text/plain`; el cliente admite ambos (envelope o cuerpo directo).
