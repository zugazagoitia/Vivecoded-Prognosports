# PrognoSports: requisitos y decisiones técnicas para el rediseño en Vue

Documento de trabajo para crear issues y sub-issues en `zugazagoitia/Vivecoded-Prognosports`. Está basado en la lectura de los dos repos de referencia (`PrognoSports` backend Java y `PrognoSports-frontend` Vue), que no se han modificado. Cada requisito indica entre paréntesis el archivo de origen para trazabilidad.

## 0. Contexto y supuestos

- El rediseño es solo de frontend. El backend y la API `v2` (`https://api.prognosports.com/v2`) se mantienen tal cual.
- El backend ya permite CORS desde cualquier origen (`anyHost` en `PrognoSports.java`), así que los dominios de preview de Cloudflare funcionan sin tocar el backend.
- Idioma: toda la UI en español, con tuteo y frases en sentence case.
- Estilo: aplicar el sistema de diseño de referencia (Inter, paleta `brand`, radios, sombras, modo oscuro con clase `dark`, iconos Font Awesome 6.2). Sus componentes `P*` son documentación visual, no código reutilizable.
- Diseño de referencia: el canvas `35438527-…` contiene unos 40 artboards. Algunos describen funciones que hoy **no existen** en la app (Logros, Palmarés, Gap, Bump, Cara a cara, Consistencia, Mi temporada, Distribución). Regla vigente: ninguna propuesta entra sin datos en la API v2. Las que tienen datos están en el alcance con feature flags (sección 18). Logros y Múltiples quedan fuera (sección 25).
- Repo destino `Vivecoded-Prognosports`: hoy solo tiene `README.md` (un título) y `.gitignore`.
- Despliegue: Cloudflare Workers con Static Assets, en plan gratuito, desplegado desde GitHub Actions. Operará en paralelo a la web actual, con URLs `workers.dev` (sección 22).

## 1. Fundaciones técnicas

- 1.1 Scaffold Vue 3 + TypeScript (modo estricto) + Vite con modos `dev`, `production` y `beta`, con banner de beta por modo. Ref: `vite.config.mts`, `.env*`.
- 1.2 Variables de entorno tipadas con validación en arranque (`VITE_API_BASE_URL`, build info de git). Nunca secretos en `VITE_*`. Ref: `src/env.d.ts`.
- 1.3 Cliente HTTP único: interceptor que añade el token, desenvuelve el envelope `{success, result}` y normaliza errores `{message}`. Ref: `src/_services/index.ts`.
- 1.4 Capa de acceso a la API generada desde la especificación OpenAPI publicada (`api.prognosports.com/swagger`), con validación en runtime de las respuestas críticas (sección 19). Ref: `src/_services/*.service.ts`.
- 1.5 Router con layouts (Landing, Prógno, Empty), rutas tipadas y carga perezosa por ruta. Ref: `src/_router/routes.ts`.
- 1.6 Guards en orden: `data` (carga usuario y comunidad), `auth`, `verified`, `community`, `admin`, `home`. Redirecciones: sin login a `/login?redirect=`, sin verificar a `/verify`, sin comunidad a `/communities`, no admin a `/404`, `/` a `/home` si hay sesión. Ref: `src/_router/middleware/*.ts`.
- 1.7 Estado de cliente en Pinia (sesión, comunidad activa con persistencia del id, tema, toasts). El estado de servidor (listas, detalles, rankings) va en TanStack Query (sección 19). Ref: `src/store/*.ts`.
- 1.8 Sistema de componentes base accesibles (botón, campo, tarjeta, tabla, modal, tabs, paginación, alerta, tooltip, tag, breadcrumb, estados de carga y vacío). Ref: `src/components/lib/*`.
- 1.9 Gestión de errores de API con mensajes en español, página 404 propia y límite de errores por sección.
- 1.10 Título de página, metadatos y migas de pan por ruta. Ref: `meta.title`, `composables/useBreadcrumbs.ts`.
- 1.11 Notificaciones tipo toast. Ref: `store/toastStore.ts`.
- 1.12 Fechas y zonas horarias: formato humano, diferencia relativa, cierre de pronóstico en la zona horaria del usuario. Ref: `composables/useDayjs.ts`.

## 2. Autenticación y cuenta

- 2.1 Login con email y contraseña, con redirect tras login. Ref: `pages/auth/Login.vue`, `POST /auth/login`.
- 2.2 Registro: nombre de usuario, email, contraseña, aceptación de términos y privacidad. Ref: `pages/auth/Register.vue`, `POST /auth/register`.
- 2.3 Verificación de email con código de 6 caracteres, con reenvío. Ref: `pages/auth/VerifyEmail.vue`, `POST /auth/send-verify-email` y `/auth/verify-email`.
- 2.4 Recuperación de contraseña: solicitud por email, código y nueva contraseña. Ref: `pages/auth/ForgotPassword.vue`, `POST /auth/forgotpassword` y `PATCH /auth/changepassword`.
- 2.5 Logout del token actual, y gestión de sesiones activas: listar tokens (creado, última actividad), cerrar uno concreto, cerrar los demás. Ref: `components/user/settings/AuthTokenList.vue`, `/auth/tokens`.
- 2.6 Cambio de email (`PATCH /user/{user}/settings/email`) y de contraseña autenticado (`/settings/password`).
- 2.7 Página de cierre de sesión y 404.
- 2.8 Comportamiento ante token caducado o 401: enviar a login conservando la ruta de retorno. **Pendiente de verificar en la app en vivo.**

## 3. Perfil y ajustes de usuario

- 3.1 Perfil público (`/user/:user?`, alias `/u/`): avatar, nombre, bio, localización, rango, nivel, comunidades y puntos. Ref: `pages/user/UserProfile.vue`, `components/user/UserProfileCard.vue`.
- 3.2 Edición de datos: nombre, biografía, localización, fecha de nacimiento, zona horaria. Ref: `pages/user/UserSettings.vue`, `PATCH /user/{user}`.
- 3.3 Imagen de perfil: subir, borrar y ver. Límite de 2 MB. Ref: `api/controller/user/image/*`. Recorte de imagen en cliente.
- 3.4 Ajustes de privacidad (sección existente en el formulario). **Pendiente de verificar su alcance.**
- 3.5 Vinculación de Telegram: login con Telegram, guardar id y datos, desvincular. Ref: `POST/DELETE /user/{user}/settings/telegram`.
- 3.6 Preferencias de notificación: matriz tipo × canal (tipos: info, pre-alerta de sesión, alerta de sesión, cambios en parrilla, puntos repartidos; canales: mail y telegram). Ref: `NotificationSettingsTable.vue`, `PATCH /user/notifications/preferences`.
- 3.7 Nombres de equipos (sección "Nombres de los equipos" en ajustes). **Pendiente de verificar si es preferencia de visualización.**
- 3.8 Resumen de nivel y rango: `GET /user/{user}/communities/{community}/{competition}/{season}/resume`. Ref: `UserLevelResume.vue`.
- 3.9 Puntos acumulados por comunidad y temporada: `cummulatedpoints` y `points`.

## 4. Comunidades

- 4.1 Listado con pestañas (Todas, Abiertas, Cerradas, Mis comunidades) y buscador. Ref: `pages/communities/CommunitiesList.vue`, `GET /communities`.
- 4.2 Crear comunidad: nombre, descripción, imagen, privacidad (abierta o cerrada), competición y reglas (conjunto existente o nuevo). Ref: `pages/communities/CreateCommunity.vue` (697 líneas), `POST /communities`.
- 4.3 Detalle de comunidad: nombre, creador, fecha de creación, número de usuarios, miembros con buscador y orden ascendente o descendente. Ref: `OneCommunity.vue`, `GET /communities/{community}/members`.
- 4.4 Unirse: directamente si es abierta, o con código de invitación si es cerrada (`POST /communities/{community}/join` y `/join/{invitation}`). Ref: `InvitationToCommunity.vue`.
- 4.5 Salir de la comunidad (`POST .../quit`).
- 4.6 Regenerar la invitación y copiar la URL (`POST .../recreate`, `composables/clipboard.ts`).
- 4.7 Validación de pertenencia (`GET .../validate`) para los guards.
- 4.8 Imagen de comunidad: subir, borrar, ver.
- 4.9 Tabla de reglas y puntos de la comunidad por temporada (`RulesAndPointsTable.vue`): posición exacta, siguiente, anterior, siguiente de la siguiente, anterior de la anterior, no en podio, no en resultados, bonus por más aciertos en el GP, total por sesión.
- 4.10 Cambiar la comunidad activa desde la navbar (`CommunitiesDropdown.vue`), recordando la última usada.

## 5. Competiciones y temporadas

- 5.1 Selector de temporada (ordenadas por id descendente, por defecto la última). Ref: `pages/ranking/Ranking.vue`, `GET /seasons/current/{competition}`.
- 5.2 Listado de temporadas por competición y detalle de temporada con circuitos, pilotos, constructores y grandes premios.
- 5.3 Los usuarios solo consultan. La edición está en administración (sección 12).

## 6. Grandes Premios (calendario y detalle)

- 6.1 Listado con filtros Pasados, Próximos y Todos, buscador y paginación anterior/siguiente. Ref: `pages/gps/GrandPrixList.vue`, `GrandPrixPagination.vue`.
- 6.2 Tarjeta de GP: ronda, nombre, fecha ("Sin fecha" si no hay), circuito, estado (suspendido), imagen promocional. Ref: `list/GrandPrixItem.vue`.
- 6.3 Detalle de GP (`/gps/:competition/:season/:gp`): cabecera con circuito, variante, distancia por vuelta, distancia total y número de vueltas. Ref: `OneGrandPrix.vue`, `CircuitCard.vue`.
- 6.4 Pestañas por sesión (Clasificación, Carrera, Sprint, Clasificación sprint, u otras según `humanName`).
- 6.5 Formulario de pronóstico por sesión (sección 7).
- 6.6 Parrilla de salida por sesión: lista ordenada, tarjetas por piloto, pit lane separado, nota de incidencias. Ref: `StartGridList.vue`, `StartGridCard.vue`, `PitLaneStartGrid.vue`, `GET .../grid`.
- 6.7 Resultados por sesión y clasificación del GP: puntos, aciertos, porcentaje de aciertos, leyenda, formateo por columna. Ref: `ScoreComponent.vue` (607 líneas), `components/gps/score/formatters/*`.
- 6.8 Ver los pronósticos de otros miembros de la comunidad una vez cerrado el plazo. Ref: `GET .../tipps/{community}`, `CheckTippsModal.vue`.
- 6.9 Ver los pronósticos propios (`GET .../tipps/{community}/{user}`).
- 6.10 Estado de cierre: si ya no se puede pronosticar, mostrarlo (`ClouseDateMessage.vue`, "Ya no se puede pronosticar").
- 6.11 Bloque de próximo GP en Inicio (sección 9).
- 6.12 Imagen promocional del GP (subida en administración, sección 12.8).

## 7. Pronósticos (lógica y UI)

- 7.1 Pronóstico ordenado de N pilotos, siendo N el número de posiciones que define el conjunto de reglas de la comunidad para la sesión (`ruleSet.cantidadPilotosPronosticados(session)`).
- 7.2 Selección por arrastrar y soltar desde la lista de disponibles a la de pronosticados, y reordenación dentro de la lista. Ref: `SelectTipps.vue`, `DraggableDriverCard.vue`.
- 7.3 Lista de disponibles: buscador por piloto o equipo, ordenación por apellido, equipo, dorsal o parrilla, con dirección ascendente o descendente.
- 7.4 Acciones: guardar (solo habilitado con N pilotos), reiniciar, y aviso de cambios sin guardar.
- 7.5 Validación en cliente con las mismas reglas que el backend: cantidad exacta, sin repetidos, piloto conocido y plazo abierto. El plazo se cierra 5 minutos antes de la sesión (`Calculations.checkPredicciones`). Mensajes de error en español.
- 7.6 Cierre de plazo visible con fecha y cuenta atrás (`ClouseDateMessage`, `dateDiff`).
- 7.7 Guardado con indicador de envío y confirmación mediante toast.
- 7.8 Cargar el pronóstico previo del usuario al entrar (`getUserTipps`).

## 8. Puntuación y reglas

- 8.1 Puntos por posición exacta, por acertar la posición siguiente o anterior (±1), y por posición ±2. Ref: `util/Calculations.java`, `RuleSetData`.
- 8.2 Puntos por piloto pronosticado en el podio pero fuera del podio real (`pointsIfIsNotInPodium`) y por piloto que no entra en resultados (`pointsIfIsNotInResults`).
- 8.3 Conteo de aciertos exactos por sesión y porcentaje de aciertos.
- 8.4 Ganador de sesión: el o los usuarios con máxima puntuación, con empate compartido. Tabla `session_winners`.
- 8.5 Bonus por más aciertos en el GP (`pointsByTopScorer`, `grandprix_bonus_points`), aplicado al cerrar todas las sesiones.
- 8.6 Ganador de GP con puntos y bonus. Tabla `grandprix_winners`.
- 8.7 Conjuntos de reglas: públicos o privados, con descripción, creador y puntos por sesión. Por temporada y por comunidad, con excepciones por GP (`grand_prix_rule_sets_exceptions`).
- 8.8 Vista de la regla aplicada a un GP concreto (`FetchRuleSetInGrandPrix`).
- 8.9 Vueltas rápidas: se guardan como posición 0 en resultados y se ignoran en la puntuación. Decidido que solo se muestran (sección 17).
- 8.10 Resultados de sesión: guardar y consultar (`POST/GET .../session/{session}/results`).
- 8.11 Recalcular puntuaciones de una sesión (`POST/GET .../tipps/{community}/calculations`).

## 9. Inicio (Home)

- 9.1 Bloque de próximo Gran Premio con botón Pronosticar y mensaje "No hay próximo Gran Premio". Ref: `NextGrandPrix.vue`, `GET /gps/{competition}/next`.
- 9.2 Resumen de puntos acumulados con acceso al ranking (`PointsAccumulated.vue`).
- 9.3 Sin comunidad: redirige a Comunidades (guard `community`).
- 9.4 Bloques de Mi temporada y Palmarés detrás de feature flags (datos en sección 25).

## 10. Ranking

- 10.1 Selector de temporada (ver 5.1).
- 10.2 Pestaña "Ranking por Gran Premio": puntos por GP para cada miembro, con gráfico y tooltip de detalle. Ref: `RankingByGpTab.vue`, `useRankingCharts.ts`.
- 10.3 Pestaña "Ranking acumulado": evolución de puntos acumulados (gráfico de líneas). Ref: `RankingAccumulatedTab.vue`.
- 10.4 Pestaña "Ranking por aciertos": mapa de calor de aciertos por GP y usuario. Ref: `RankingHitsTab.vue`, `HitsTooltipComponent.vue`.
- 10.5 Pestaña "Ranking por clasificación": tabla y gráfico de posiciones. Ref: `RankingStandingsTab.vue`.
- 10.6 Celdas de usuario con rango (nombre y color) y enlace al perfil. Ref: `RankingUserCell.vue`, `UserMiniCard.vue`.
- 10.7 Estados de carga y vacío por pestaña.
- 10.8 Propuestas del canvas con datos (Gap, Bump, Consistencia, Cara a cara, Distribución, Heatmap de GP, Aciertos por tipo) detrás de feature flags.

## 11. Circuitos

- 11.1 Listado de circuitos con buscador. Ref: `pages/circuits/CircuitList.vue`, `GET /circuits`.
- 11.2 Detalle de circuito: nombre, localidad, país, logo, mapa, variantes y layout. Ref: `OneCircuit.vue` (mapa Leaflet con teselas OpenStreetMap y CARTO, con atribución obligatoria).
- 11.3 Grandes Premios que usaron el circuito o la variante (`/circuits/{circuit}/gps`, `/variant/gps`). Mensaje "No se ha usado este circuito en ningún Gran Premio".
- 11.4 Visualización de la variante con su layout (imagen) y datos de vueltas.

## 12. Administración (back-office)

- 12.1 Acceso solo para admin (guard `requiresAdmin`; si no, 404).
- 12.2 Panel general con accesos a cada sección. Ref: `pages/admin/AdminDashboard.vue`.
- 12.3 Pilotos: listado, alta, edición y borrado. Por temporada: añadir, editar, quitar (número, equipo, color). Ref: `pages/admin/drivers/*`, `pages/admin/seasons/drivers/*`.
- 12.4 Constructores: listado, alta, edición y borrado. Por temporada: car, nombre completo y color. Ref: `pages/admin/constructors/*`, `pages/admin/seasons/constructors/*`.
- 12.5 Circuitos: CRUD, logo (subir, borrar), variantes (crear, editar, borrar), layout (subir, ver, borrar). Ref: `pages/admin/circuits/*`.
- 12.6 Competiciones: CRUD y sesiones disponibles. Ref: `pages/admin/competitions/*`.
- 12.7 Temporadas: CRUD, circuitos de la temporada, grandes premios añadidos, pilotos y constructores por temporada. Ref: `pages/admin/seasons/*`.
- 12.8 Grandes Premios: CRUD, ronda, circuito y variante, número de vueltas, suspensión, sesiones, pilotos del GP e imagen promocional (subir, borrar, ver). Ref: `pages/admin/gps/*`.
- 12.9 Sesiones: CRUD con código, nombre, si tiene parrilla, si tiene vuelta rápida, y qué sesiones define su parrilla (`defineGridOf`). Ref: `pages/admin/sessions/*`.
- 12.10 Parrilla por sesión: definir todas las posiciones, pit lane, nota de incidencia por piloto y envío de notificación de cambios. Ref: `components/admin/gps/EditGrid.vue`.
- 12.11 Resultados por sesión: entrada de posiciones 1..N y vuelta rápida. Ref: `components/admin/gps/EditResults.vue`.
- 12.12 Conjuntos de reglas: listado, alta con puntos por posición, borrado y ver dónde se usan. Ref: `pages/admin/*`.
- 12.13 Usuarios: listado y detalle en admin (`GET /user` y `GET /user/{user}`). Solo lectura: no hay edición, borrado ni activación o desactivación de cuentas de otros usuarios, porque el backend no lo permite y no se modifica.
- 12.14 Uso de cada sesión antes de borrarla (`GET /sessions/{session}/usages`).
- 12.15 Zonas horarias disponibles (`GET /timezones`) para formularios.

## 13. Landing y páginas informativas

- 13.1 Landing con llamada a registro ("¿Preparado para comenzar? ¡Regístrate y pruébalo gratis!"), bloques de características y footer con versión de build. Ref: `LandingHome.vue`, `LandingFooter.vue`.
- 13.2 Preguntas frecuentes (`Faq.vue`).
- 13.3 Reglas del juego (`Rules.vue`), con el contenido de puntuación de la sección 8.
- 13.4 Contacto (`Contact.vue`).
- 13.5 Términos y privacidad (`Terms.vue`, `Privacy.vue`).
- 13.6 SEO y PWA: título y metadatos por ruta, favicons, manifiesto web. Ref: `public/`.

## 14. Notificaciones (producto, implementadas en backend)

- 14.1 Tipos: info, pre-alerta de sesión (día antes), alerta de sesión (minutos antes), cambios en parrilla y puntos repartidos. Ref: `model/NotificationType.java`, `scheduler/*`.
- 14.2 Canales: mail (plantillas jte: verify_email, forgot_password, session_alert, points_dispatched, grid_changes, info, layout) y Telegram. Las notificaciones web se eliminaron (migración V9).
- 14.3 Planificación automática de avisos por GP (`SchedulerManager`), reprogramada 24 h después del último evento.
- 14.4 Zona horaria del usuario para mostrar las horas en los avisos.
- 14.5 Frontend: solo gestión de preferencias y vinculación de Telegram (sección 3).

## 15. Tema, accesibilidad y responsive

- 15.1 Modo claro y oscuro con clase `dark` en `<html>`, persistido, con interruptor en la navbar. Ref: `store/themeStore.ts`, `navbar/SwitchTheme.vue`.
- 15.2 Navbar de 56 px, expandida en `md`, con menú de avatar, selector de comunidad y accesos según rol.
- 15.3 Móvil primero: sin scroll horizontal salvo en tablas, que se desplazan dentro de su contenedor. Propuestas del canvas: GPMovil, InicioMovil, TablaMovil.
- 15.4 Accesibilidad: foco visible, contraste AA, `aria-label` en botones de icono, `prefers-reduced-motion` y objetivos táctiles de 44 px.
- 15.5 Modales y tooltips accesibles, con cierre por teclado y gestión de foco.

## 16. Hallazgos del código actual

- 16.1 Estilos mezclados: Tailwind, Bulma 0.9 y Oruga conviven (`AGENTS.md`). Bulma y Oruga se retiran.
- 16.2 Cadenas de UI en español escritas directamente en componentes. Se centralizan (sección 19).
- 16.3 El token de sesión se guarda en `localStorage`. Ver riesgos en la sección 23.
- 16.4 ESLint tiene errores preexistentes y el frontend no tiene tests.
- 16.5 Backend: el cierre de pronósticos está fijo en 5 minutos (`Calculations.checkPredicciones`, issue #44 enlazado en el código).
- 16.6 Backend: endpoints marcados "ToDo: Borrar" (`/rulesets/{community}/{competition}/{season}/{grandprix}` y `/notifications/methods`) y un método `recalculate` deprecado.
- 16.7 Backend: `RaceSession.humanName()` tiene nombres de sesión en español escritos a mano ("ToDo: Translate").
- 16.8 Backend: el scheduler guarda en memoria los GP ya programados. Tras reiniciar se reprograma; conviene comprobarlo.
- 16.9 Frontend: iconos de Font Awesome con clases en texto y, en el landing, Material Icons. Se unifica.
- 16.10 El `.env` apunta a la API pública. El modo beta usa siempre la API de producción (`AGENTS.md`).
- 16.11 Dependencias de visualización actuales (ApexCharts, Leaflet, vuedraggable, vue-advanced-cropper, vue-sonner) se sustituyen según la sección 19.
- 16.12 Despliegue actual por rsync sobre SSH (`.github/actions/rsync-deploy`). Se sustituye por Cloudflare Workers con Static Assets (sección 22). La web actual sigue en su servidor hasta que se decida el corte.

## 17. Decisiones de producto tomadas

1. La API `v2` se mantiene sin cambios. No hay cambios de backend en el alcance.
2. Entran las propuestas del canvas que tienen datos en la API v2: Mi temporada, Palmarés, Gap, Bump, Consistencia, Cara a cara, Distribución, Heatmap de GP y Aciertos por tipo. Cada una es activable con feature flags en el frontend. Quedan fuera Logros y Múltiples, porque no tienen datos en la API (sección 25).
3. Las vueltas rápidas solo se muestran. No se pronostican ni se puntúan.
4. Administración de usuarios: el admin solo ve el listado y el detalle. Editar datos, activar o desactivar y borrar cuentas quedan fuera porque la API actual no lo permite y no se toca el backend. Para hacerlo haría falta añadir endpoints de administración en backend, en un paso aparte.
5. Gráficas: Apache ECharts para ranking y estadísticas.

## 18. Feature flags

- 18.1 Sistema de feature flags solo en frontend: definición tipada de flags, lectura desde configuración por entorno y valor por defecto apagado (en producción están todos activados vía `.env.production`).
- 18.2 Un flag por propuesta con datos: Mi temporada, Palmarés, Gap, Bump, Consistencia, Cara a cara, Distribución, Heatmap de GP y Aciertos por tipo. Logros y Múltiples no tienen flag porque quedan fuera.
- 18.3 Rutas, enlaces de navegación y bloques de Inicio de cada propuesta se ocultan por completo cuando su flag está apagado, incluidas las peticiones de datos asociadas. El código de la propuesta se carga de forma perezosa, para que no pese en el bundle principal.
- 18.4 Ninguna propuesta se implementa sin datos de la API v2 (sección 25). Si una propuesta deja de tener datos, se retira en lugar de pedir un cambio de backend.
- 18.5 Los flags se pueden activar en previews de Cloudflare para revisar una propuesta sin afectar a producción (sección 22).

## 19. Stack técnico (state of the art)

Las versiones concretas se fijan en el scaffold, usando la última estable de cada herramienta en ese momento. Aquí se decide qué herramienta se usa y por qué.

| Área | Actual | Propuesta | Motivo |
|---|---|---|---|
| Framework | Vue 3, Options y Composition mezclados | Vue 3.5, Composition API con `<script setup>`, TypeScript en modo estricto, `vue-tsc` en CI | Estándar actual de Vue. Tipado completo de componentes y props |
| Build | Vite | Vite estable más reciente | Sigue siendo el estándar de Vue |
| Router | vue-router | vue-router estable, con rutas tipadas (`unplugin-vue-router`) | Rutas por archivo y parámetros tipados |
| Estado de cliente | Pinia | Pinia (sesión, comunidad activa, tema, toasts) | Pinia es el store oficial de Vue |
| Estado de servidor | Llamadas directas en componentes y stores | TanStack Query para Vue (`@tanstack/vue-query`) | Caché, reintentos, invalidación y estados de carga y error. Evita duplicar lógica de datos |
| Validación de API | Ninguna | Tipos generados desde OpenAPI (`openapi-typescript`) y esquemas Zod en las respuestas críticas | Detecta cambios de contrato en tiempo de compilación y ejecución |
| Formularios | Manual | VeeValidate con Zod | Validación declarativa y tipada. Reutiliza los mismos esquemas |
| Estilos | Tailwind 3 con config JS, más Bulma | Tailwind CSS v4 con tokens del sistema de diseño en `@theme` | Tokens como variables CSS, un único sistema de estilos y modo oscuro por clase |
| Componentes accesibles | Componentes propios | Reka UI (primitivas headless, accesibles, port de Radix para Vue) | Accesibilidad de teclado y foco resuelta. Se estiliza con los tokens del diseño |
| Tablas | Componentes propios | TanStack Table (headless) | Ordenación, filtros y paginación en las tablas de admin y ranking |
| Gráficas | ApexCharts | Apache ECharts con `vue-echarts`, importación modular | Mapas de calor, líneas y tooltips ricos. Tema claro y oscuro |
| Mapas | Leaflet | MapLibre GL JS con teselas vectoriales de OpenStreetMap | Vectorial, más nítido en móvil, con atribución de OSM |
| Arrastrar y soltar | vuedraggable | `vue-draggable-plus` (SortableJS) | Alternativa más moderna para Vue 3 |
| Recorte de imagen | vue-advanced-cropper | Mantener si cumple. Revisar en el scaffold | Funciona, sin motivo para cambiarlo ahora |
| Notificaciones | vue-sonner | Mantener | Accesible y ligero |
| Fechas | dayjs | `Intl` nativo con `date-fns` | Sin dependencias pesadas y zonas horarias con `Intl` |
| Iconos | Font Awesome y Material Icons | Font Awesome 6 (como indica el sistema de diseño), auto-hospedado con npm | Un solo sistema de iconos, sin CDN externo |
| Tipografía | Google Fonts | Inter auto-hospedada con `@fontsource-variable/inter` | Sin peticiones a terceros, mejor rendimiento y privacidad |
| i18n | Cadenas en componentes | `vue-i18n` con locale `es` como único idioma | Centraliza las cadenas. Deja la puerta abierta a otros idiomas |
| Utilidades | Varias | VueUse | Estándar de composables |
| Lint | ESLint con errores previos | oxlint para velocidad, ESLint flat config con `eslint-plugin-vue` para reglas de Vue | Cero errores nuevos. Lint rápido en CI |
| Formato | Editorconfig | Prettier o oxfmt, con `.editorconfig` | Formato automático en pre-commit |
| Gestor de paquetes | pnpm | pnpm, versión fijada en `devEngines` | Ya usado en el proyecto. Instalaciones reproducibles |
| Pre-commit | Ninguno | Lefthook o Husky con lint-staged | Evita pasar errores a la rama |

## 20. Calidad y testing

- 20.1 Unitarios con Vitest y `@vue/test-utils`: composables, stores, validaciones de pronóstico, formateadores, lógica de feature flags y guards.
- 20.2 Cobertura mínima en la lógica de pronósticos y validaciones (umbral definido en CI). La cobertura de componentes visuales no se exige.
- 20.3 Mocks de API con MSW (Mock Service Worker) en tests y en desarrollo local, usando los mismos esquemas que el cliente real.
- 20.4 Tests de contrato: la especificación OpenAPI descargada se compara con una copia versionada, y el cambio se revisa en la PR.
- 20.5 E2E con Playwright en Chromium, Firefox y WebKit, y en viewport móvil, cubriendo: login y registro, verificación de email, crear o unirse a comunidad, hacer un pronóstico, ver resultados y ranking, y administración (solo lectura de usuarios).
- 20.6 Accesibilidad automatizada con axe-core en cada página de E2E, con fallo en violaciones serias o críticas.
- 20.7 Tests visuales de regresión con capturas de Playwright para componentes base y páginas clave, en claro y oscuro.
- 20.8 Tests de rendimiento: presupuesto de tamaño de bundle por ruta (`size-limit` o equivalente) que falla en CI si se supera. Umbrales de Core Web Vitals medidos en E2E.
- 20.9 Tests de rutas de la API con datos reales de una temporada de referencia, solo en lectura y contra la API pública.

## 21. CI/CD con GitHub Actions

- 21.1 Workflow `ci.yml` en `pull_request` y en `push` a `develop` y `master`: instalación con lockfile congelado, lint, `vue-tsc`, tests unitarios con cobertura, build, presupuesto de bundle y E2E.
- 21.2 Build una sola vez y reutilizar el artefacto `dist/` en los jobs de E2E y de deploy, para que lo probado sea exactamente lo desplegado.
- 21.3 Caché de pnpm y de Playwright, para tiempos de CI razonables.
- 21.4 Permisos mínimos en cada job (`contents: read`, `pull-requests: write` solo donde se comenta la preview) y `persist-credentials: false` en checkout.
- 21.5 Acciones de terceros fijadas por SHA de commit, como ya hace el proyecto, y actualizadas por Dependabot.
- 21.6 `concurrency` por rama o PR para cancelar ejecuciones obsoletas.
- 21.7 Variables de build: `VITE_GIT_*` se calcula en CI con el SHA del commit, con `fetch-depth` suficiente, porque el clon superficial no tiene el historial que lee `vite.config`.
- 21.8 Los secretos de Cloudflare solo se exponen a PRs del mismo repositorio. Los PRs de forks usan `pull_request` sin secretos y no despliegan preview.
- 21.9 Entornos de GitHub (`beta` y `production`) con reglas de protección. Producción exige aprobación manual.
- 21.10 Protección de ramas: no se puede fusionar a `develop` ni a `master` sin que pasen los checks de CI. Se mantiene el flujo actual: PR a `develop`, y `develop` a `master` para producción.
- 21.11 Changelog por release generado desde commits convencionales (opcional, a decidir).
- 21.12 Renovate o Dependabot para dependencias npm y de acciones, con agrupación de actualizaciones menores.
- 21.13 Escaneo de seguridad: `pnpm audit` en CI y CodeQL para JavaScript/TypeScript, con alertas a la pestaña de seguridad.

## 22. Despliegue en Cloudflare Workers con Static Assets (plan gratuito)

Decisión: Workers con Static Assets, desplegado con Wrangler desde GitHub Actions. Es la opción gratuita más completa. Cloudflare la recomienda para proyectos nuevos.

Por qué, frente a Pages, según la documentación oficial consultada:

- Las peticiones a ficheros estáticos son gratuitas y sin límite en el plan Free. Las peticiones dinámicas (Worker) tienen un límite de 100.000 al día, y no hay código de servidor en el diseño, así que no se consumen.
- Pages en Free tiene límite de 500 builds al mes y 20.000 ficheros por sitio. Como el build se hace en GitHub Actions, este límite no aplicaría, pero Workers no lo tiene.
- Pages es el producto que Cloudflare presenta como anterior para proyectos nuevos. Ambos son gratuitos.

Requisitos para no gastar un euro:

- Solo usar: Workers con Static Assets, `wrangler deploy`, `workers.dev` como dominio, GitHub Actions. No usar KV, D1, R2, Durable Objects, Queues ni Workers Paid.
- Mantener el repositorio público o revisar los minutos gratuitos de GitHub Actions (2.000 al mes en repositorios privados en el plan Free de GitHub).
- Sin dominio propio en esta fase. El despliegue en paralelo usa URLs `workers.dev`, que son gratuitas.

Configuración:

- 22.1 `wrangler.jsonc` con `assets.directory: "./dist"` y `assets.not_found_handling: "single-page-application"`. Así las rutas profundas devuelven `index.html` sin invocar el Worker, y no consumen peticiones dinámicas.
- 22.2 Sin código de Worker propio, salvo que se necesite lógica de cabeceras (ver 22.6).
- 22.3 Previews por PR: cada PR sube una versión con `wrangler versions upload` (que no cambia producción) y publica su URL de preview en un comentario del PR. **Verificar al implantar que la URL de preview de versión está disponible en el plan Free.** Si no lo está, la alternativa es un Worker de preview por PR con nombre `prognosports-pr-<número>`, con borrado al cerrar el PR.
- 22.4 Beta: la rama `develop` hace `wrangler deploy` a un Worker `prognosports-beta` en `workers.dev`. Beta sigue usando la API de producción, según `AGENTS.md`.
- 22.5 Producción paralela: la rama `master` hace `wrangler deploy` a `prognosports` en `workers.dev`, tras aprobación en el entorno `production`. No hay DNS que mover: el dominio actual sigue en el servidor actual. El corte de dominio se decide cuando la web nueva esté validada.
- 22.6 Cabeceras de seguridad y caché: se configuran en un Worker mínimo con `assets` y `run_worker_first` solo para `/*` si hace falta CSP y `Cache-Control`. Alternativa sin Worker: `_headers` si Workers Static Assets lo admite en la versión de Wrangler fijada. **Verificar al implantar.**
- 22.7 Caché: los ficheros con hash de Vite llevan `Cache-Control: public, max-age=31536000, immutable`. `index.html` va con `no-cache`.
- 22.8 Rollback: `wrangler rollback` o reactivar una versión anterior desde el panel. El procedimiento queda documentado en el repositorio.
- 22.9 Limpieza: eliminar las versiones y Workers de previews de PRs cerradas, con un job al cerrar el PR, para no acumular recursos.
- 22.10 Secretos: `CLOUDFLARE_API_TOKEN` con permiso mínimo (editar Workers de la cuenta) y `CLOUDFLARE_ACCOUNT_ID`, guardados en el entorno de GitHub correspondiente. Nada sensible en `wrangler.jsonc`.
- 22.11 CORS: el backend ya acepta cualquier origen (`anyHost`), así que las URLs `workers.dev` de beta y preview funcionan sin tocar el backend.
- 22.12 Cuando se decida el dominio propio, se añade como custom domain del Worker de producción. Es gratuito si el dominio ya está en Cloudflare.

## 23. Seguridad, observabilidad y rendimiento

- 23.1 Errores en producción: Sentry (o equivalente) para errores de JavaScript y de promesas, con mapas de código fuente subidos desde CI y sin enviar datos personales.
- 23.2 Métricas de uso y Core Web Vitals con Cloudflare Web Analytics, sin cookies, para cumplir con la privacidad.
- 23.3 Token de sesión: se mantiene en `localStorage` mientras la API no ofrezca cookies httpOnly. Mitigación: CSP estricta, sin `v-html` con datos de usuario, y sanitizado de cualquier HTML que llegue de la API.
- 23.4 Ninguna variable `VITE_*` contiene secretos, porque se publica en el bundle.
- 23.5 Carga de rutas y librerías pesadas de forma perezosa, con ECharts y MapLibre importados solo donde se usan.
- 23.6 Imágenes en formato WebP o AVIF, con dimensiones explícitas para evitar desplazamientos de diseño.
- 23.7 Preconexión al dominio de la API en `index.html`.
- 23.8 Página de mantenimiento o aviso de error de carga de chunks tras un despliegue, con recarga controlada.

## 24. Riesgos y puntos a verificar

- 24.1 Confirmar al implantar dos detalles del plan gratuito: la URL de preview por versión en Workers (22.3) y la compatibilidad de `_headers` con Static Assets (22.6). Ambos tienen alternativa documentada.
- 24.2 La especificación OpenAPI en `api.prognosports.com/swagger` debe ser accesible para generar tipos y para los tests de contrato. Si no lo es, se generan tipos desde una copia versionada.
- 24.3 Las propuestas del canvas sin datos en la API (sección 18.4) quedarán bloqueadas hasta que se decida si se amplía la API.
- 24.4 El comportamiento ante 401 global (2.8) y el alcance de la privacidad (3.4) y de los equipos (3.7) se verifican contra la app en vivo antes de crear los issues.
- 24.5 Administración de usuarios limitada a lectura (12.13), por decisión de no tocar el backend.
- 24.6 La especificación completa (subida por ti, OpenAPI 3.0.3, 88 rutas, 135 operaciones, 31 esquemas) cubre todas las áreas del backend, incluidas temporadas, sesiones, usuario, rulesets, notificaciones y zonas horarias.
- 24.7 Discrepancias entre la especificación y el backend, a confirmar antes de tipar el cliente: la regeneración de invitación aparece como `recretate` (typo); la parrilla por sesión aparece como `/gps/.../{session}/grid` en la especificación, mientras que el backend la expone como `/gps/.../sessions/{session}/grid`; `PUT /gps/.../sessions` declara un parámetro `session` que no está en la ruta; y `GET /competitions/{competition}` tiene un resumen de "update". En `UserPoints` los campos `stadingsByHits` y `previousStandingsByHits` tienen typo (`stadings`).
- 24.8 Seguridad: el esquema `User` de la especificación incluye `hashedPassword` y `email`. El frontend no debe renderizar ni depender de `hashedPassword`. Si el backend no lo oculta en las respuestas, es un hallazgo para revisar en backend en un paso aparte, sin tocar la API ahora.

## 25. Datos de la API y propuestas

Fuente: especificación OpenAPI 3.0.3 de "PrognoSports API" 2.0.0, subida como archivo y leída completa. Está publicada en `https://api.prognosports.com/openapi` y su interfaz Swagger en `https://api.prognosports.com/swagger`. Los esquemas de esta sección vienen directamente de la especificación.

### 25.1 Endpoints por área

- Puntos de comunidad: `GET /v2/communities/{community}/{competition}/{season}/points` (puntos por GP y usuario), `GET .../points/{grandprix}` (`UserPoints[]` del GP: `pointsInGP`, `accumulatedPoints`, `standings`, `previousStandings`, `hitsInGP`, `hitPercentageInGP`, `pointsBySession`, `hitsBySession`, `hitPercentageBySession`, `bonusPoints`, `stadingsByHits`, `accumulatedHits`), `GET .../totaluserpoints`. Usado por 4.9, 10.2 a 10.5 y por las propuestas Gap, Bump, Consistencia, Cara a cara, Distribución, Heatmap de GP y Aciertos por tipo.
- Resumen de usuario: `GET /v2/user/{user}/communities/{community}/{competition}/{season}/resume` (`UserResume`: `totalPoints`, `standings`, `average`, `totalHits`, `totalPointsBySession`, `averagePointsBySession`, `participationsBySession`, `wonSessions`, `wonGrandPrixes`, `bestGP`, `worstGP`), `GET .../cummulatedpoints`, `GET .../points`, `GET .../points/{grandprix}`. Usado por 3.8, 3.9, Mi temporada y Palmarés.
- Pronósticos y cálculo: `GET` y `POST /v2/gps/{competition}/{season}/{grandprix}/sessions/{session}/tipps/{community}` (pronósticos), y su `/calculations` por GET y POST. El POST simula resultados enviados en el cuerpo y devuelve `pointsByPosition`, `hits`, `hitsBySession` y `totalHits`. Usado por 6.8, 6.9, 7, 8.11 y Aciertos por tipo.
- Resultados y parrilla: `GET` y `POST .../sessions/{session}/results`, `GET .../grid`, `PATCH .../grid`, `PATCH .../grid/notification`, `PATCH .../grid/{driver}` (nota de incidencia), `GET .../grid/{driver}`. Usado por 6.6, 6.7, 8.10, 12.10 y 12.11.
- Grandes premios y sesiones: `GET /v2/gps`, `GET /v2/gps/{competition}/{season}`, `POST /v2/gps/`, `GET /v2/gps/{competition}/next`, sesiones (`POST`, `GET`, `PUT`, `GET` y `DELETE` por id), pilotos del GP (`GET`, `POST`, `DELETE`), imagen promocional (`GET`, `POST`, `DELETE`). Usado por 6, 9.1, 12.8 y 12.9.
- Circuitos: `GET` y `POST /v2/circuits/`, `GET`, `PUT` y `DELETE` por circuito, variantes por `{circuit}/{variant}` (`GET`, `PUT`, `DELETE`, `POST` de registro), logo, layout y `GET .../gps` por circuito y variante. Usado por 11 y 12.5.
- Comunidades: `GET` y `POST /v2/communities`, detalle, miembros, `POST .../{invitation}` para unirse, `POST .../quit`, regeneración de invitación (`recretate`, ver 24.7), imagen. Usado por 4.
- Competiciones, constructores y pilotos: CRUD completo, más `GET /v2/competitions/{competition}/seasons`. Usado por 12.3, 12.4 y 12.6.
- Autenticación: login, logout, register, forgotpassword, changepassword, verify-email, send-verify-email, y `GET`, `DELETE` de tokens (uno o todos). Usado por la sección 2.
- Temporadas, sesiones independientes, usuario, rulesets, notificaciones y zonas horarias: `GET /v2/seasons`, `/v2/seasons/current/{competition}`, `/v2/seasons/{season}/circuits|constructors|drivers|gps`, `/v2/sessions` (CRUD y `/usages`), `/v2/user` y `/v2/user/me`, `/v2/user/{user}` (solo `PATCH` sobre el propio usuario), `/v2/user/{user}/image`, `/v2/user/{user}/settings/email|password|telegram`, `/v2/user/{user}/communities`, `/v2/rulesets` (CRUD, `/usages`, y resolución por comunidad, temporada y GP), `/v2/notifications/channels|types|preferences`, `/v2/timezones`. Usado por 2, 3, 8, 12.9, 12.12, 12.14, 12.15 y 14.5.
- No existen en la API: borrado, activación o desactivación de usuarios por un admin; catálogo de logros; datos de ganadores por GP o sesión fuera de `resume`; apuestas múltiples.

### 25.2 Decisión sobre las propuestas del canvas

| Propuesta | Datos en la API | Decisión |
|---|---|---|
| Mi temporada | `resume`, `points`, `cummulatedpoints` | Incluida |
| Palmarés | `resume`: `wonSessions`, `wonGrandPrixes`, `bestGP`, `worstGP` | Incluida |
| Gap | `points/{gp}`: `accumulatedPoints` por GP | Incluida |
| Bump | `points/{gp}`: `standings`, `previousStandings` | Incluida |
| Consistencia | `points/{gp}`: `pointsInGP` por GP | Incluida |
| Cara a cara | `points/{gp}` de dos usuarios | Incluida |
| Distribución | `points/{gp}`: `pointsBySession`, `hitsBySession` | Incluida |
| Heatmap de GP | `points/{gp}`: `hitsInGP` por GP | Incluida |
| Aciertos por tipo | `hitsBySession`, `hitPercentageBySession`, con el tipo de sesión como clave | Incluida |
| Logros | No hay catálogo de logros ni endpoint para ellos. Las reglas de cada logro no existen en la API | Excluida |
| Múltiples | No está definida en el canvas y no tiene endpoint asociado | Excluida |

Logros y Múltiples se pueden reconsiderar cuando haya datos para ellas en la API.

### 25.3 Esquemas principales

| Esquema | Campos principales |
|---|---|
| `User` | `id`, `username`, `email`, `bio`, `location`, `birthdate`, `gender`, `timeZone`, `rank` (`UserRank`), `currentCommunity`, `preferences` (mapa), `resume` (`UserResume`), `hasProfileImage`, `verified`, `created`, `lastActivity`; incluye `hashedPassword` (ver 24.8) |
| `UserRank` | `id`, `name`, `color`, `admin` |
| `UserPoints` | `user`, `grandPrix`, `pointsBySession`, `pointsInGP`, `accumulatedPoints`, `standings`, `previousStandings`, `hitsInGP`, `hitPercentageInGP`, `hitsBySession`, `hitPercentageBySession`, `stadingsByHits`, `previousStandingsByHits`, `accumulatedHits`, `bonusPoints` |
| `UserResume` | `totalPoints`, `standings`, `average`, `totalHits`, `totalPointsBySession`, `averagePointsBySession`, `participationsBySession`, `wonSessions`, `wonGrandPrixes`, `bestGP`, `worstGP` (`Pair`) |
| `Community` | `id`, `name`, `description`, `competition`, `open`, `invitation`, `owner`, `membersAmount`, `userIsMember`, `created`, `hasImage`, `defaultRuleSet` |
| `CommunityUser` | `community`, `user`, `userInCommunity`, `join_date`, `left_date`, `can_modify_permissions`, `can_recreate_invitation`, `can_kick_users` |
| `Competition` | `id`, `code`, `name`, `fullname`, `rules`, `currentSeason`, `availableSessions` |
| `Season` | `id`, `name`, `totalEvents`, `competition` |
| `GrandPrix` | `id`, `name`, `code`, `round`, `competition`, `season`, `circuit`, `variant`, `sessions`, `previousGrandPrix`, `nextGrandPrix`, `lastSessionDate`, `suspended`, `laps`, `hasPromoImage`, `hasPointsInGrandPrix` |
| `RaceSession` | `id`, `key`, `name`, `code`, `hasGrid`, `hasFastLap`, `grandPrix`, `defineGridOf`, `date`, `uses` |
| `RaceResult` | `gp`, `driver`, `position`, `raceSession` |
| `Prediction` | `user`, `gp`, `driver`, `position`, `raceSession` |
| `StartGridPosition` | `gp`, `session`, `driver`, `position`, `isFromPit`, `note` |
| `Driver` | `id`, `firstname`, `lastname`, `code`, `nationality`, `birth`, `color`, `number`, `team` (`Constructor`) |
| `Constructor` | `id`, `name`, `carname`, `longname`, `teamcolor` |
| `Circuit` | `id`, `name`, `country`, `locality`, `latitude`, `longitude`, `hasLogoImage`, `variants` |
| `CircuitVariant` | `id`, `circuitId`, `name`, `distance`, `turns`, `hasLayoutImage` |
| `RuleSet` | `id`, `displayname`, `description`, `creator`, `public`, `data` (`RuleSetData`), y los puntos opcionales por tipo de posición |
| `RuleSetData` | `predictedPositions`, `pointsByEqualsPosition`, `pointsByNextPosition`, `pointsByNextOfFollowingPosition`, `pointsByPreviousPosition`, `pointsByPreviousOfPreviousPosition`, `pointsIfIsNotInPodium`, `pointsIfIsNotInResults`, `pointsByTopScorer` |
| `AuthToken` | `user`, `token`, `createdAt`, `lastActivityAt`, `lifetime`, `ipAddress`, `agent`, `current` |
| `NotificationChannel` | `id`, `label`, `enabled`, `suscribed` |
| `NotificationType` | enum: `INFO`, `SESSION_PRE_ALERT`, `SESSION_ALERT`, `GRID_CHANGES`, `POINTS_DISPATCHED` |
| `ScoreCalculationsRequest` | `results`: lista de `{position, driver: {id}}` |
| `ScoreCalculationsResponse` | `pointsByPosition`, `hits`, `hitsBySession`, `totalHits` |
| `ApiResponse` | `success`, `status`, `code`, `message`, `result`, `parseType` |

La tabla lista los campos principales. Qué campos son obligatorios o nullable se confirma al generar los tipos del cliente.
