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

5. `Community`: la API real envía `members_amount` y `user_is_member` (snake_case; la spec dice camelCase) y `GET /communities/{id}` no incluía `id` (a 2026-10-11 ya lo trae; se sigue aceptando sin él). `CommunitySchema` acepta ambas formas y normaliza al modelo camelCase (`membersAmount`, `userIsMember`); `getCommunity` rellena `id` con el solicitado (`CommunityDetailSchema`).
6. `RuleSet`: la API real envía `isPublic` (la spec dice `public`); se acepta cualquiera de las dos y el modelo expone `public`. `data.pointsByEqualsPosition` es `{ [sesión]: { [posición]: puntos } }` (objetos anidados, no números).
7. `GrandPrix`: `/gps` y `/gps/{id}` no envían `round` (solo el listado por temporada), por lo que es opcional. Esas respuestas solo traen `id`, `name` y `code`.

### Circuitos públicos (P3, sondeado sin sesión el 2026-10-11)

- `GET /v2/seasons/current/{competition}`, `GET /v2/seasons/{season}/circuits` y `GET /v2/gps/{competition}/{season}` responden sin token. `{competition}` admite el `code` (`f1`) además del id (`1`); un id inexistente da HTTP 200 con `success:false` («Competencia inválida»).
- La temporada 2026 (id 9) tiene `totalEvents: 24` pero solo 23 circuitos y 23 GP: el subtítulo usa la longitud real de la lista.
- Sprint: los fines de semana con sprint traen en `sessions[]` una sesión `code: "SR"` (`name: "SPRINT_RACE"`, `id` 4; las sesiones de un GP **no** traen `key`, ver «Contraste de mocks»); no aparece `SQ` en el GP aunque sí en `competition.availableSessions` (`SQ` = `SPRINT_QUALIFY`, `key` 3). `isSprintWeekend` acepta `SQ`/`SR`/`S`, el nombre `SPRINT_*` o las keys 3/4.
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

### Ranking y estadísticas (R0–R13, sondeado el 2026-10-11)

Sondeado con la cuenta de prueba (solo lecturas, sus comunidades no tenían ningún GP puntuado) y con un backend local con 17 GP puntuados.

- `GET /v2/communities/{c}/{comp}/{season}/points` devuelve **todo el ranking de la temporada en una sola llamada**: `{ [grandPrixId]: UserPoints[] }`, solo con los GP que tienen puntos (`{}` si no hay ninguno). Las pantallas del ranking lo usan en lugar de pedir `points/{grandprix}` por GP; **un GP «disputado» es el que aparece en ese mapa** (el listado `GET /v2/gps/{c}/{s}` no trae `hasPointsInGrandPrix`).
- `GET .../points/{grandprix}` devuelve a **todos** los miembros también para un GP sin puntuar (todo a 0), así que no sirve para saber si un GP está disputado.
- `UserPoints` real: `accumulatedPoints`, `bonusPoints`, `hitPercentageBySession`, `hitPercentageInGP`, `hitsBySession`, `hitsInGP`, `pointsBySession`, `pointsInGP`, `standings`, `user` (`id`, `username`, `preferences`). `previousStandings` no apareció; el movimiento se calcula con los acumulados.
- `pointsBySession` y `hitsBySession` van indexados por la **`key` de la sesión** (`1` = clasificación, `2` = carrera, `4` = sprint…), no por su `id` ni por su nombre. `UserResume.*BySession` va por nombre en español («Carrera», «Clasificación Sprint»). `kindOfKey` (`src/lib/rankingStats.ts`) acepta ambas formas.
- `GET /v2/communities/{c}/{comp}/{season}/totaluserpoints` devuelve `{ [username]: total }` (por nombre de usuario, no por id; no distingue homónimos): no se usa. El palmarés calcula la clasificación final de cada temporada con `…/points`.
- `GET /v2/communities/{c}/members`: cada elemento trae `isUserInCommunity` (la spec y `normaliseMembers` esperaban `userInCommunity`); se acepta también `isUserInCommunity`.
- `UserPoints.user` solo trae `username` (sin nombre completo): los nombres de pila del diseño se derivan de la primera palabra del `username`.
- Los GP de la temporada usan códigos de 2 a 4 letras (`CH`, `JAP`, `UK`…), no siempre de 3.
- Sin datos puntuados en la cuenta de prueba no se ha podido verificar contra producción: `hitsInGP`, `bonusPoints` y `pointsBySession` con valores reales (sí se vieron en el backend local).

### Administración (épica M, verificado contra un backend local el 2026-10-11)

Solo la forma de los campos; las escrituras viven en `src/api/admin.ts` y nunca se han lanzado contra `api.prognosports.com`.

- `POST /v2/gps/` (solo `name`, `code`), `POST /v2/drivers` y `POST /v2/constructors` responden el cuerpo **sin `id`**: el creado se busca después en el listado (`GET /v2/gps`, `/v2/drivers`, `/v2/constructors/`) por código/nombre.
- Alta de GP en la temporada: `POST /v2/seasons/{season}/gps` con `{ gp, circuit, variant, laps, round }` (ids de circuito/variante como cadena) funciona.
- Edición de GP (no está en la spec): `PUT /v2/gps/{id}` cambia `name` y `code`; `PUT /v2/gps/{competition}/{season}/{id}` cambia `round`, `laps`, `circuit` y `variant`. En la spec `PUT /v2/gps/{grandprix}` figura como «Borrar» y sin cuerpo.
- Parrilla: la ruta real es `PATCH /v2/gps/{c}/{s}/{gp}/sessions/{session}/grid` (y `.../grid/notification`, `.../grid/{driver}`), no la de la spec sin sesión. Cuerpo `{ grid: [{ position, driver, isFromPit, note }] }` con `driver` = id numérico (no `{ id }`).
- Resultados: `POST .../sessions/{session}/results` con `{ results: { "<posición>": <idPiloto> }, fastLap }`. La lista `[{ position, driver }]` se rechaza («Solicitud inválida»). Solo se guardan si la sesión ya se disputó y el piloto está en el GP.
- Pilotos del GP: la spec anota `POST .../drivers`, pero la ruta real es `PUT` (sustituye la lista) con un diccionario constructor → pilotos, `{ "<idConstructor>": [{ "id": <idPiloto> }] }`. Un array `[{ id }]` da HTTP 500 con POST y PUT, y POST con objeto da «Solicitud inválida». Verificado en local (#145). Pendiente de backend solo que el 500 debería ser un 4xx.
- No existen `POST /v2/notifications` (aviso manual) ni `POST .../sessions/{session}/calculations` (recálculo global): 404 con texto plano, sin envelope. M12 y M13 muestran «aún no disponible».
- `GET /v2/notifications/channels` responde un mapa `{ mail: "Email", telegram: "Telegram" }` (la spec: lista de `{ id, label, enabled }`); `GET /v2/notifications/types` también es un mapa con claves en minúsculas con guion.
- Colores (`color`, `teamcolor`) pueden venir con o sin `#`; `cssColor()` normaliza.
- `GET /v2/seasons/{season}/drivers` no trae `team`; el equipo de cada piloto sale de `GET .../gps/{c}/{s}/{gp}/drivers`.
- `User.rank` del administrador local trae solo `{ id, name, color }`, sin `admin`: el guard `admin` del frontend (`rank.admin === true`) no lo reconocería. Por confirmar si en producción llega `admin`.
- `RuleSet.data` va indexado por la **clave** de sesión (1 Q, 2 R, 3 SQ, 4 SR); `POST /v2/rulesets` guarda `data` pero devuelve `isPublic` falso aunque se envíe `true`.
- El `code` de la competición local es el nombre largo, no `f1`: el frontend usa `f1` (válido en producción).

- `GET /v2/user/me`: `rank` llega como `{ id, name, color }` sin el booleano `admin` que la spec marca como requerido (comprobado en el backend local con un admin real; en producción un miembro devuelve `name: "Miembro"`). El frontend considera admin `rank.admin === true` o `rank.name` igual a «admin» (sin distinguir mayúsculas), `isAdmin` en `src/stores/session.ts`. Se podrá simplificar cuando el backend serialice `admin`.

### Contraste de mocks con la API real (2026-10-11)

Contrastado endpoint a endpoint con producción (cuenta de prueba, solo GET) y con un backend local con datos puntuados (también escrituras, solo en local). Solo formas, sin datos. Los mocks (MSW y `e2e/support/api.ts`) y las fixtures se han alineado; `pnpm test:contract` con `CONTRACT_TEST_TOKEN` vigila lo verificable.

- **`GET .../sessions/{s}/tipps/{community}` devuelve un mapa por usuario**, no una lista: `{ "<userId>": [ { driver, position, raceSession: { name } } ] }`, con **todos** los miembros de la comunidad (lista vacía para quien no pronosticó) y filas sin `user` ni `gp`. `TippsResponseSchema` acepta lista o mapa y aplana poniendo `user.id` desde la clave. Quien necesite solo los suyos usa `mineOf(rows, userId)` (`queries/gp.ts`): sin usuario conocido nunca mezcla los de otros.
- **Los pronósticos ajenos se envían ya antes del cierre**: el backend no los oculta (comprobado en local con la sesión en el futuro) y tampoco exige ser miembro de la comunidad para leerlos. El front los descarta: `buildRows` no lee los de otros en el momento `pre`, y el consenso solo se pide con la sesión cerrada. Pendiente de backend (issue).
- **`GET|POST .../tipps/{community}/calculations`**: todos los campos son mapas por usuario (`pointsByPosition: { "<userId>": { "<posición>": puntos } }`, `totalHits`, `hitsAmount`, `hitsBySession`), no un objeto plano. `ScoreCalculationsWireSchema` + `scoreCalculationsFor(wire, userId)` extraen el del usuario; `getCalculations`/`simulateCalculations` reciben el `userId`.
- **`POST .../calculations` (simulador)** rechaza `results: [{ position, driver: { id } }]` («Solicitud inválida»); exige `driver` como id numérico: `[{ position, driver: <id> }]`. Con `{ id }` el simulador no funcionaba contra el backend real.
- **Unirse a una comunidad**: la ruta real es `POST /v2/communities/{id}/join/{invitation}` (la de la spec, `/{id}/{invitation}`, da 404). Un código incorrecto responde HTTP 200 `{ success:false, message:"No autorizado. Invitación inválida" }` (no 606); sin código en una cerrada, «Se necesita invitación».
- **Sesión caducada/ausente = HTTP 200**, no 401: `{ success:false, message:"No autorizado. Token inválido" | "Token no encontrado" }`; «No autorizado. No tienes permiso para eso» es la falta de permisos. `authFailureStatus` (`client.ts`) los convierte en 401/403 (con `emitSessionExpired` en el primero). Antes la caducidad de sesión nunca se detectaba.
- **`GET /v2/rulesets/{community}/{competition}/{season}` no existe** (404 «Endpoint GET … not found», text/plain) en producción ni en local; sí existe `.../{grandprix}`. `getCommunityRuleset` usa `Community.defaultRuleSet` como alternativa.
- **`GET /v2/rulesets/{id}/usages`** devuelve la lista de comunidades que lo usan (`{ id, name, description, open, user_is_member }`), no un número (`parseUsages` ya lo cuenta).
- **`GET /v2/communities/{id}/members`**: cada elemento es `{ user, isUserInCommunity, join_date, can_* }` (nunca un `User` plano). La pantalla de resultados leía el listado como `User[]` y quedaba sin miembros; ahora usa `normaliseMembers`.
- **`User`**: `rank` es `{ id, name, color }` (color sin `#`, sin `admin`; un administrador es el rango `admin`); no hay `time_zone`: la zona horaria está en `preferences['time-zone-id']` (`UserSchema` la lee de ahí). `/user/{id}` (otros usuarios) solo trae `id`, `username`, `rank`, `created`, `updated`, `last_activity`, `hasProfileImage`.
- **`PATCH /v2/user/{id}` exige `password`** (la contraseña actual; sin ella, HTTP 200 «Credenciales inválidas») y la zona horaria se cambia con `preferences: { "time-zone-id": … }`, no con `timeZone`. La pantalla de cuenta (#146) pide ahora «Confirma con tu contraseña» y envía `{ …campos cambiados, preferences: { "time-zone-id" }, password }` (`toProfilePatch`); una contraseña ausente o errónea llega como HTTP 200 `{ success:false, message:"Credenciales inválidas" }` y se muestra bajo el campo. Los mocks (MSW y `e2e/support/account.ts`) responden igual. Verificado en el backend local: sin `password` o con una errónea responde HTTP 200 «Credenciales inválidas»; `preferences['time-zone-id']` cambia la zona; **`birthdate` solo se acepta como `DD/MM/YYYY`** (con `YYYY-MM-DD` responde éxito pero lo ignora; se lee como `YYYY-MM-DD`), por eso `toApiDate`; y los valores vacíos (`bio`, `location`, `birthdate` a `""`) se ignoran, así que no se pueden vaciar (a reportar al backend).
- **`GET /v2/user/{u}/communities/{c}/{comp}/{s}/points` y `.../cummulatedpoints`** devuelven un mapa `{ "<nombre del GP>": puntos }` (no `UserPoints[]`); `.../points/{gp}` sí es un `UserPoints`. `.../totaluserpoints` ya estaba documentado. Ninguna pantalla los usa aún.
- **Sesiones**: las de un GP (`sessions[]`) y `GET /v2/sessions` **no traen `key`** (`id` 1 Q, 2 R, 3 SQ, 4 SR compartidos por todos los GP; `/sessions` añade `uses`). Los mocks ya usan los nombres reales `QUALIFY`/`RACE`. **Pendiente**: las fixtures siguen enviando `key` y ids de sesión únicos por GP (`round*10+i`) en lugar de los compartidos 1–4 (`key` hace de puente con los rulesets, indexados por id de catálogo en la API real); quitarlos exige rehacer ids y reglas de las fixtures.
- **GP**: `previousGrandPrix`/`nextGrandPrix` solo traen `{ id }` (0 si no hay), y `laps`/`hasPromoImage` vienen siempre. Resultados, parrilla y pronósticos traen el piloto con `number` y `team` (`teamcolor` sin `#`, `carname`, `longname`) y **sin `color`** (solo `tipps` y `/drivers` lo incluyen); `teamColor()` admite ambos.
- **Competición**: `code` en minúscula (`f1`), con `rules`, `currentSeason` y `availableSessions`; `Season` trae `competition`.
- **Errores de escritura (solo local)**: un `verify-email` con código malo (usuario de prueba) responde HTTP 403 «No autorizado. No tienes permiso para eso» y `send-verify-email` HTTP 500 (cuerpo de Javalin sin envelope); `settings/email|password` con contraseña mala dan HTTP 200 «Credenciales inválidas»; `POST /v2/gps/.../tipps/{community}` correcto responde `{ message:"ok", success:true }` (sin `result`). `POST /v2/auth/register` acepta cualquier cosa (usuario `a`, correo `bad`, contraseña `1`) con 200 y **crea el usuario**; no hay `DELETE /v2/user/{id}`. Los mocks de estos errores siguen con los códigos HTTP supuestos (pendiente, issue).
- **Campos opcionales que los mocks aún no envían** (la forma del resto coincide): `preferences`/`currentCommunity` en `user/me`; `competition.currentSeason|rules` y `hasImage` en comunidades; `latitude`/`longitude` en circuitos de las listas; `variant.distance|turns` en el GP; `team.carname|longname` en pilotos; `hitPercentage*`, `standings`, `previousStandings` en `points`; `pointsIfIsNotIn*` en los rulesets.
- `GET /v2/gps/{c}/{s}/{gp}/sessions/{s}/grid` devuelve `[]` mientras no se publique la parrilla (local) y solo con token.
