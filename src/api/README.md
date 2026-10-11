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

### Circuitos públicos (P3, sondeado sin sesión el 2026-10-11)

- `GET /v2/seasons/current/{competition}`, `GET /v2/seasons/{season}/circuits` y `GET /v2/gps/{competition}/{season}` responden sin token. `{competition}` admite el `code` (`f1`) además del id (`1`); un id inexistente da HTTP 200 con `success:false` («Competencia inválida»).
- La temporada 2026 (id 9) tiene `totalEvents: 24` pero solo 23 circuitos y 23 GP: el subtítulo usa la longitud real de la lista.
- Sprint: los fines de semana con sprint traen en `sessions[]` una sesión `code: "SR"` (`name: "SPRINT_RACE"`, `key` 4); no aparece `SQ` en el GP aunque sí en `competition.availableSessions` (`SQ` = `SPRINT_QUALIFY`, `key` 3). `isSprintWeekend` acepta `SQ`/`SR`/`S`, el nombre `SPRINT_*` o las keys 3/4.
- `GrandPrix.variant` no incluye `hasLayoutImage`; hay que buscarla en `circuit.variants[]` por `id`.
- Layout: `GET /v2/circuits/{circuit}/{variant}/layout` devuelve un PNG público (RGBA, fondo transparente, trazo oscuro) solo si `hasLayoutImage`; `GET /v2/circuits/{id}/layout` (sin variante) devuelve JSON, no imagen. El logo (`/circuits/{id}/logo`) puede devolver 200 con 0 bytes cuando `hasLogoImage` es false. `circuitLayoutUrl()` (`catalog.ts`) construye la URL; la CSP ya permite `img-src https://api.prognosports.com`.
- Se listan los circuitos de la temporada en curso (no `GET /circuits/`); los que no tuvieran GP irían al final sin etiqueta de ronda.

### Detalle de circuito (P4, sondeado sin sesión el 2026-10-11)

- `GET /v2/circuits/{id}` es público y trae `latitude`/`longitude` y `variants[]` (`distance` en km, `turns`, `hasLayoutImage`). Un id inexistente devuelve HTTP 200 con `{"success":false,"message":"Circuito inválido"}` (sin `status`): el cliente lo convierte en `ApiError` con `status` 200; la pantalla lo trata como 404 propia.
- `GET /v2/circuits/{id}/{variant}/gps` es público y trae todas las ediciones (varias temporadas) con `season`, `laps`, `lastSessionDate`, `sessions[]` y `variant` (sin `hasLayoutImage`). Un mismo GP conserva su `id` entre temporadas: la temporada hay que tomarla de `season.id`.
- No hay campo de sentido de giro ni de forma corta del nombre: la fila «Sentido» se oculta y la miga usa `Circuit.name`.
- Ganador de la comunidad / historial: `points/{grandprix}` es una petición por GP y exige sesión. Se limita a los 5 GP disputados más recientes de la variante (`POINTS_GP_LIMIT`); el resto muestra «—». La media de la temporada sale de `…/resume` (`average`) de la temporada en curso.
- Mapa: no hay tiles propios; se usan teselas raster de CARTO (ver `docs/security.md`).

## URL base

`VITE_API_BASE_URL` es solo el origen (`https://api.prognosports.com`, sin `/v2`): las rutas de los envoltorios ya empiezan por `/v2` (igual que en la spec). La validación de entorno rechaza una URL que termine en `/v2` (evita peticiones a `/v2/v2/...`). Los mocks (MSW y `e2e/support/api.ts`) interceptan `*/v2/**` y no dependen del origen.

Además: la spec describe las respuestas sin envelope y el login como `text/plain`; el cliente admite ambos (envelope o cuerpo directo).

### Fin de semana de carrera (G2, sondeado sin sesión el 2026-10-11)

- `GET /v2/gps/{competition}/{season}/{gp}` es público y devuelve el GP completo con `round` y `sessions`; `previousGrandPrix`/`nextGrandPrix` solo traen `id` (sin nombre ni código), por eso la pantalla toma anterior/siguiente de la lista de la temporada (por `round`). Un id inexistente da HTTP 200 con `success:false` («Gran premio inválido»).
- Nombres de GP en inglés («Singapore Grand Prix»): el título quita el sufijo («Gran Premio de Singapore»). Sesiones: `code` `Q`/`R`/`SR` (+`SQ`), `name` `QUALIFY`/`RACE`/`SPRINT_RACE`, ids 1/2/4 compartidos entre GP, y la lista NO viene en orden cronológico. Solo `SR` y `R` tienen `hasGrid`.
- `GET /v2/gps/{c}/{s}/{gp}/image` es una imagen JPEG pública si `hasPromoImage` (`gpImageUrl`).
- Exigen sesión (no probados): `sessions/{s}/results|grid|tipps/{community}[/calculations]`, `points/{gp}`, `rulesets/{community}/{c}/{s}[/{gp}]`. La spec no define `/tipps/{community}/{user}`: se usa `/tipps/{community}` filtrando por usuario. La clave de `pointsBySession` y la de las reglas por sesión no están documentadas: se prueban id, key, code y name.
- La API no tiene zona horaria del circuito (solo coordenadas): `circuitTimeZone` usa una tabla país/ciudad; si no hay, se oculta «Hora del circuito».
- «N de M han pronosticado» no se muestra: los pronósticos ajenos son privados hasta el cierre y no hay endpoint de recuento.

### Administración (épica M, verificado contra un backend local el 2026-10-11)

Solo la forma de los campos; las escrituras viven en `src/api/admin.ts` y nunca se han lanzado contra `api.prognosports.com`.

- `POST /v2/gps/` (solo `name`, `code`), `POST /v2/drivers` y `POST /v2/constructors` responden el cuerpo **sin `id`**: el creado se busca después en el listado (`GET /v2/gps`, `/v2/drivers`, `/v2/constructors/`) por código/nombre.
- Alta de GP en la temporada: `POST /v2/seasons/{season}/gps` con `{ gp, circuit, variant, laps, round }` (ids de circuito/variante como cadena) funciona.
- Edición de GP (no está en la spec): `PUT /v2/gps/{id}` cambia `name` y `code`; `PUT /v2/gps/{competition}/{season}/{id}` cambia `round`, `laps`, `circuit` y `variant`. En la spec `PUT /v2/gps/{grandprix}` figura como «Borrar» y sin cuerpo.
- Parrilla: la ruta real es `PATCH /v2/gps/{c}/{s}/{gp}/sessions/{session}/grid` (y `.../grid/notification`, `.../grid/{driver}`), no la de la spec sin sesión. Cuerpo `{ grid: [{ position, driver, isFromPit, note }] }` con `driver` = id numérico (no `{ id }`).
- Resultados: `POST .../sessions/{session}/results` con `{ results: { "<posición>": <idPiloto> }, fastLap }`. La lista `[{ position, driver }]` se rechaza («Solicitud inválida»). Solo se guardan si la sesión ya se disputó y el piloto está en el GP.
- Pilotos del GP: `POST .../drivers` (sustituye la lista) responde HTTP 500 con cualquier array probado (incluido `[]`); con un objeto responde «Solicitud inválida». **Pendiente de backend**: forma del cuerpo desconocida.
- No existen `POST /v2/notifications` (aviso manual) ni `POST .../sessions/{session}/calculations` (recálculo global): 404 con texto plano, sin envelope. M12 y M13 muestran «aún no disponible».
- `GET /v2/notifications/channels` responde un mapa `{ mail: "Email", telegram: "Telegram" }` (la spec: lista de `{ id, label, enabled }`); `GET /v2/notifications/types` también es un mapa con claves en minúsculas con guion.
- Colores (`color`, `teamcolor`) pueden venir con o sin `#`; `cssColor()` normaliza.
- `GET /v2/seasons/{season}/drivers` no trae `team`; el equipo de cada piloto sale de `GET .../gps/{c}/{s}/{gp}/drivers`.
- `User.rank` del administrador local trae solo `{ id, name, color }`, sin `admin`: el guard `admin` del frontend (`rank.admin === true`) no lo reconocería. Por confirmar si en producción llega `admin`.
- `RuleSet.data` va indexado por la **clave** de sesión (1 Q, 2 R, 3 SQ, 4 SR); `POST /v2/rulesets` guarda `data` pero devuelve `isPublic` falso aunque se envíe `true`.
- El `code` de la competición local es el nombre largo, no `f1`: el frontend usa `f1` (válido en producción).
