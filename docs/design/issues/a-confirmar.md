# ⚠️ A confirmar (generado de las 80 issues)

Lista agrupada por épica. Cada punto está también en la sección «⚠️ A confirmar» de su issue.

## Base técnica ([#1](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/1))

### [T1] Scaffold Vue 3.5 + Vite + TS estricto + pnpm ([#65](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/65))

- Ramas: §21.10 habla de `develop` → `master`, pero este repo solo tiene `main`. ¿Se crean `develop` y `master`, o se usa `main` + `develop`?
- Versión de la app que se muestra en el pie (`v2.0.0` en el mockup): ¿sale de `package.json`?

### [T2] Cliente API v2, tipos OpenAPI y Zod ([#66](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/66))

- Formato exacto del header de autenticación del backend actual (¿`Authorization: Bearer` o cabecera propia?).
- `openapi-fetch` frente a cliente propio: elegir en la PR.
- Campos obligatorios/nullable reales de cada esquema: se confirman al generar los tipos (§25.3).

### [T3] Router (unplugin-vue-router), layouts y guards ([#67](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/67))

- Slugs en español o inglés (`/registro` frente a `/register`, `/comunidades` frente a `/communities`): las issues de pantalla usan español; los redirects de §1.6 usan los antiguos. Propuesta: español y redirecciones 301 desde los antiguos.
- Comportamiento real del backend ante token caducado (§2.8, pendiente de verificar en la app en vivo).

### [T4] Pinia + TanStack Query ([#68](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/68))

- ¿La comunidad activa se guarda también en el backend (`User.currentCommunity`)? Si sí, al cambiarla se hace `PATCH` y se usa como valor inicial.

### [T5] i18n (es) y fechas/números con Intl ([#69](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/69))

- Nombre corto de cada sesión («Clasif. sprint»): la API solo trae `RaceSession.name`; el mapa por `key`/`code` se define en el cliente.
- Zona horaria por defecto para visitantes sin sesión (navegador frente a Europe/Madrid).

### [T6] Feature flags VITE_FF_* (12) ([#70](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/70))

- `docs/requisitos.md` §18.2 lista 9 flags; el mockup añade 3 (`TITLE_RACE`, `POINTS_BY_SESSION`, `COMMUNITY_PERCENTILE`). Se implementan los 12.
- ¿Cómo se detecta «preview» en tiempo de ejecución? Propuesta: modo de Vite `preview` o variable `VITE_PREVIEW=true` que pone el job de previews (T12).

### [T7] Errores y toasts (vue-sonner) ([#71](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/71))

- Duración de los toasts (propuesta: 4 s éxito, 8 s error, error sin autocierre si incluye acción).

### [T8] Lint, formato y pre-commit (oxlint, ESLint, Prettier, Lefthook) ([#72](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/72))

- Prettier frente a oxfmt (§19 deja ambas opciones).
- Lefthook frente a Husky + lint-staged.

### [T9] Tests unitarios y de componentes (Vitest, MSW) ([#73](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/73))

- Umbral exacto de cobertura (propuesta 90 % en dominio).

### [T10] E2E y accesibilidad (Playwright multinavegador, axe, regresión visual) ([#74](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/74))

- ¿Regresión visual también en Firefox/WebKit, o solo Chromium?

### [T11] CI en GitHub Actions (build único, acciones fijadas por SHA, CodeQL, audit, Dependabot) ([#75](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/75))

- Nombres de ramas (`develop`/`master` en §21 frente a `main` actual).
- ¿Changelog automático (§21.11)?

### [T12] Despliegue Cloudflare Workers Static Assets (beta, producción con aprobación, previews, rollback) ([#76](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/76))

- URL de preview por versión en plan Free (§24.1).
- Soporte de `_headers` con Static Assets en la versión de Wrangler fijada (§22.6, §24.1); afecta a T13.
- Ramas de beta y producción (ver T1/T11).

### [T13] Seguridad: CSP, cabeceras, política de tokens ([#77](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/77))

- Mecanismo de cabeceras (`_headers` o Worker), depende de T12.
- Si la API devuelve `hashedPassword`, reportarlo como hallazgo de backend aparte (no se toca la API ahora).

### [T14] Observabilidad y presupuesto de rendimiento (size-limit, Web Vitals) ([#78](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/78))

- Sentry (plan gratuito) frente a alternativa; requiere cuenta y DSN (no es secreto, pero sí configuración).
- Umbrales exactos del presupuesto.

### [T15] Tests de contrato contra la API v2 ([#79](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/79))

- Temporada y comunidad pública de referencia.
- ¿Qué endpoints son públicos sin token? Determina el alcance real de la suite.

## Guía, fundamentos y piezas compartidas ([#2](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/2))

### [F1] Tokens y tema (claro/oscuro) ([#80](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/80))

- Nombres finales de los tokens de datos: el canvas usa `--c-you`, `--hit-ex`, `--hit-1`; el README usa `series-you`, `hit-exact`, `hit-near`. Propuesta: nombres del README en Tailwind.
- Tema por defecto: sistema (como el canvas) o claro (como la app actual).

### [F2] Tipografía, iconos y layout ([#81](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/81))

- Equivalentes FA para `cloud_off`, `wifi_off`, `search_off`, `lock_clock`.
- Punto de corte exacto (900 px del canvas frente a `md` 768 / `lg` 1024 de Tailwind).

### [F3] Componentes base ([#82](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/82))

- ¿Se mantienen los nombres `P*` del sistema actual o se renombran (p. ej. `UiButton`)? Propuesta: mantener `P*`.

### [F4] Piezas de datos (HitCell, FormChips, PredictionSlot, ValidationList, SaveBar, BottomSheet, PlayerChip) ([#83](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/83))

- La `SaveBar` invertida del design system frente a la variante `surface` de G3: confirmar que conviven las dos.

### [F5] Gráficos (foco+contexto, modos, eje pulsable, tabla alternativa) ([#84](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/84))

- Renderer SVG (nitidez, accesibilidad) frente a Canvas (rendimiento con muchos jugadores). Propuesta: SVG.

### [F6] Estados del sistema (carga, vacío, error) ([#85](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/85))

- Cómo sabe el cliente que una sesión «tiene resultados» (¿`GET .../results` vacío, o un campo de `RaceSession`?). La nota del tablero dice que «la API ya marca» ambos estados; confirmar el campo.

### [N1] AppNav + SiteFooter ([#86](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/86))

- **Avisos**: la API v2 no tiene histórico ni leído/no leído (ver U4, bloqueada). El punto rojo y el menú «Hoy» no tienen datos. Propuesta: el icono lleva a Ajustes › Notificaciones (preferencias) sin punto, hasta que se decida U4.
- «Contacto» enlaza a FAQ en el mockup: ¿hay página de contacto (§13.4)?
- Columna «Comunidades abiertas» (H3) para visitantes: ¿H3 es pública?

### [N2] TabBar + MobileBar ([#87](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/87))

- Volver: ¿siempre al `backHref` fijo de cada pantalla, o al historial si existe?
- Ranking en la TabBar abre Clasificación (R1) y no el Resumen (R0) como en escritorio: confirmar.
- Avisos en móvil: mismo problema de datos que N1/U4.

### [N3] RankNav ([#88](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/88))

- El mockup llama «Por sesión» a dos vistas distintas (R13 en Por GP y R11 en Aciertos). Propuesta: R11 «Por tipo de sesión».
- Slugs de `:seccion/:vista` (solo está fijado `evolucion/gap`); propuesta: `resumen`, `clasificacion/general`, `por-gp/tabla|mapa-de-calor|distribucion|por-sesion`, `evolucion/gap|bump|titulo`, `aciertos/por-tipo|regularidad`, `comparar/cara-a-cara|mi-temporada`, `palmares`.
- Temporadas a mostrar: ¿todas las de la competición o solo en las que la comunidad tiene puntos?

### [N4] AdminSide y layout admin ([#89](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/89))

- Etiqueta del elemento «Reglas de puntuación»: la lista móvil de M1 dice «Reglas». Unificar.

## Público ([#3](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/3))

### [P1] Landing ([#23](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/23))

- a confirmar en API: si `GET /v2/seasons/current/{competition}` responde sin token para pintar «Temporada {año} en marcha»; si no, el año va en el contenido estático.
- Los datos de demostración (GP de Azerbaiyán, jugadores Álex/Marta/Pablo, comunidad «Amigos del paddock» «Tras 17 GP») no salen de ningún endpoint público: se proponen como contenido estático marcado como ejemplo. Confirmar que se acepta así o si se retira el bloque.
- Foto del hero (`/_blob/bf0336…`) y logo: hace falta el archivo final con licencia de uso y en WebP/AVIF (23.6).

### [P2] Cómo se puntúa ([#24](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/24))

- Bonus del GP: el mockup y el requisito 8.5 dicen «más aciertos»; la decisión de producto dice `pointsByTopScorer` = 5 pts a quien más puntos suma en el GP. Se especifica el texto con «más puntos»; confirmar redacción final.
- a confirmar en API: lectura sin sesión de un conjunto de reglas (`GET /v2/rulesets` / `GET /v2/rulesets/{id}`) y cuál es «el más habitual» («Clásica 2026»).
- a confirmar en API: forma de `RuleSetData.predictedPositions` y de los puntos por sesión (M9 habla de 8 conceptos × 4 sesiones).
- Orden exacto de evaluación en backend (`Calculations.java`): si «podio fuera del podio» se evalúa antes o después de ±1/±2. El mockup lo evalúa después.
- Horas de cierre del segmentado («Viernes 12:25», etc.): se tratan como ilustrativas y estáticas; confirmar que no deben salir del próximo GP.
- Destino de «Empezar a pronosticar» con sesión iniciada (propuesta `/home`).

### [P3] Circuitos ([#25](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/25))

- a confirmar en API: si `GET /v2/seasons/{season}/circuits`, `GET /v2/gps/{competition}/{season}` y `GET /v2/seasons/current/{competition}` responden sin sesión.
- El requisito 11.1 habla de `GET /circuits` (todos), pero el mockup lista los de la temporada con su ronda. Confirmar si se listan solo los de la temporada o todos (y qué etiquetas llevan los que no están en la temporada).
- a confirmar en API: ruta del layout de la variante y cómo saber qué variante usa el GP de la temporada (`GrandPrix.variant`).
- Cómo se identifica una sesión sprint (`RaceSession.code`/`key`).
- Si la búsqueda debe ignorar tildes (el mockup solo pasa a minúsculas).

### [P4] Detalle de circuito ([#26](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/26))

- a confirmar en API: ruta de `GET .../gps` por variante y por circuito, y del layout de la variante (25.1).
- a confirmar en API: «Sentido» del trazado no existe en `CircuitVariant`; se propone ocultarlo.
- Distancia de carrera: el mockup no cuadra con longitud × vueltas (306,1 frente a 306,3). Confirmar fórmula o fuente.
- Notas por temporada de «Tu historial aquí» («Exacto con Russell en la carrera», «Fallaste el podio de la carrera»): requieren cruzar pronósticos (`GET …/tipps/{community}/{user}`) y resultados de cada sesión; confirmar si se implementan o se omiten.
- Ganador de la comunidad por GP: requiere una petición `points/{grandprix}` por GP listado (N peticiones). Confirmar si se acepta o se limita.
- Año de alta para el estado vacío: `CommunityUser.join_date` o `User.created`.
- Escala de la barra de historial (62 fijo en el mockup).
- Forma corta del nombre en la miga («Marina Bay») sin campo en la API.
- Comportamiento sin sesión (ocultar historial y columna de ganador) y con una sola variante (ocultar pestañas).

### [P5] Preguntas frecuentes ([#27](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/27))

- Dirección de correo de contacto real («contacto@prognosports.com» en el mockup).
- Texto del toast al copiar el correo (no está en el mockup).
- Si la búsqueda debe ignorar tildes (el mockup solo pasa a minúsculas).

### [P6] Términos y privacidad ([#28](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/28))

- Textos legales definitivos, fecha de actualización, responsable, edad mínima, proveedores (p. ej. Cloudflare Web Analytics y Sentry, secciones 23.1–23.2) y correo de contacto.
- Rutas `/terms` y `/privacy` (nombres propuestos siguiendo `Terms.vue` y `Privacy.vue`).

## Acceso ([#4](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/4))

### [A1] Iniciar sesión ([#29](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/29))

- a confirmar en API: cuerpo de `POST /v2/auth/login` (correo o usuario) y códigos de error para credenciales incorrectas y cuenta no verificada.
- «Continuar con Telegram» no tiene endpoint de login en la API v2; propuesta: ocultarlo.
- «Mantener la sesión iniciada en este dispositivo» no tiene parámetro en la API; propuesta: `sessionStorage` si se desmarca.
- Texto del aviso de retorno para destinos que no son un pronóstico de GP.
- Panel lateral: datos del próximo GP sin sesión y textos para otros plazos o sin próximo GP; «Tus amigos ya han pronosticado» como texto fijo.
- Textos de validación por campo (correo vacío o inválido, contraseña vacía).

### [A2] Registro ([#30](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/30))

- a confirmar en API: cuerpo de `POST /v2/auth/register`, si devuelve token y si envía el código de verificación por sí mismo.
- Reglas de backend para nombre de usuario (caracteres permitidos) y contraseña (mínimo y complejidad).
- Textos de error no presentes en el mockup: usuario fuera de 3–20, usuario o correo ya registrados, términos sin aceptar, campos vacíos.
- Diseño móvil de registro (no hay mockup).
- Si los enlaces a términos y privacidad se abren en pestaña nueva.

### [A3] Recuperar contraseña ([#31](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/31))

- a confirmar en API: cuerpo y respuestas de `POST /v2/auth/forgotpassword` (en especial el código cuando el correo no existe).
- Caducidad del código (el mockup dice 30 minutos).
- Comportamiento con sesión iniciada.

### [A4] Nueva contraseña ([#32](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/32))

- a confirmar en API: cuerpo de `PATCH /v2/auth/changepassword` (¿correo + código + contraseña?) y error de código incorrecto o caducado.
- Si el backend cierra las demás sesiones al cambiar la contraseña (texto del éxito).
- Textos de error de código y de contraseñas distintas (no están en este mockup).
- Si el correo de recuperación incluye enlace con el código para precargarlo.

### [A5] Verificación de correo ([#33](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/33))

- a confirmar en API: cuerpo de `POST /v2/auth/verify-email` y `POST /v2/auth/send-verify-email`, y si el registro ya envía el primer código.
- Duración de la cuenta atrás de reenvío y límite de reenvíos del backend.
- Texto del botón de reenvío habilitado y del toast tras reenviar.
- Si el indicador de pasos se actualiza al verificar.
- Variante de AppNav para un usuario con token pero sin verificar.
- Destino tras verificar si ya tiene comunidad o había `redirect`.

## Inicio y comunidades ([#5](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/5))

### [H1] Inicio ([#16](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/16))

- URL de Inicio: `/home` (req. 1.6) o `/` (mapa de rutas del canvas).
- Nombre de pila para el saludo: el esquema `User` solo tiene `username`.
- Imagen del bloque del GP: imagen promocional del GP o layout de la variante.
- Endpoint del pronóstico propio por sesión (`…/tipps/{community}/{user}`) no listado en 25.1.
- «{n} de {m} miembros ya han pronosticado» y sus avatares: no hay forma documentada de saber quién ha pronosticado antes del cierre (req. 6.8).
- Umbral de tiempo para «Cierra pronto» y comportamiento de una sesión cerrada pero aún no terminada (entre cierre y resultados).
- Texto de «a {n} del líder» cuando eres el líder, y de la diferencia en «Tu entorno» con empate («−0»).
- Modo «Con el de delante» cuando eres 1.º (el mockup compara con el 2.º).
- Palmarés: origen de títulos y puestos de temporadas pasadas y qué etiquetas se muestran.
- Actividad: sin endpoint en la API v2.
- Estados vacíos de KPI y gráficos en una temporada sin GP disputados.

### [H2] Mis comunidades ([#17](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/17))

- Ruta en español (`/comunidades`) frente a `/communities` del req. 1.6.
- Unirse con código: `POST …/{community}/join/{invitation}` necesita el id de comunidad; no hay endpoint documentado para resolver la comunidad desde el código.
- Pronósticos pendientes por comunidad («Te faltan 2»): requiere el pronóstico propio por sesión y comunidad (`…/tipps/{community}/{user}`), no listado en 25.1; texto con 0 pendientes no definido.
- Texto «Tus pronósticos son los mismos en todas…»: en la API los pronósticos son por comunidad (`tipps/{community}`); confirmar que es cierto antes de publicarlo.
- Evolución del percentil: número de GP del sparkline y fuente (`standings` por GP); el mockup usa datos aleatorios.
- Percentil con una comunidad de 1 miembro (división por cero) y comunidades sin datos en temporadas pasadas.
- «Hacer activa»: solo en cliente (Pinia) o también en `User.currentCommunity`; si unirse activa la comunidad.
- Color de fondo de la comunidad sin imagen.
- Estado vacío sin comunidades.

### [H3] Explorar comunidades ([#18](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/18))

- Ruta `/comunidades/explorar` (no está en el mapa de rutas).
- Endpoint de unión a una comunidad abierta sin invitación (`POST …/{community}/join`): la sección 25.1 solo nombra `POST …/{invitation}`.
- Filtro, orden y paginación en servidor o en cliente; tamaño de página.
- «Tengo un código»: destino (H7 necesita un código en la URL; quizá abrir el formulario de H2 o un modal).
- Contradicción: H4 dice que una cerrada «No aparece en el buscador», pero Explorar tiene la pestaña «Cerradas» (req. 4.1).
- Color de las comunidades sin imagen.

### [H4] Crear comunidad ([#19](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/19))

- Ruta `/comunidades/crear`.
- Subida de imagen en la creación: el endpoint de imagen necesita el id de la comunidad.
- Campos exactos del `POST /v2/communities` (competición, temporada, reglas).
- `RuleSetData` con puntos por sesión: el mockup pide 3 columnas (clasificación, sprint, carrera) y el esquema solo lista un valor por concepto.
- Fuente de `predictedPositions` por sesión para el máximo teórico.
- Si la comunidad recién creada pasa a ser la activa.
- Aviso de cambios sin guardar al cancelar.
- Longitud mínima del nombre y si la descripción es obligatoria.

### [H5] Comunidad ([#20](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/20))

- Redirección si el usuario no es miembro.
- Quién ha pronosticado cada sesión antes del cierre (columna «{GP}» y «Han pronosticado el {sesión}»).
- Puesto de cada jugador en cada GP para la forma (calcular desde `pointsInGP`).
- Roles posibles además de «Creador» y «Jugador».
- Visibilidad del bloque Invitar para miembros sin permiso de regenerar.
- Confirmación al salir y comportamiento si sale el creador.
- Temporadas en que jugó la comunidad y fila de una temporada en la que no jugaste.
- Empates en «Líder del fin de semana» y «Último GP».
- Ruta de regenerar invitación: `recretate` (typo) frente a `recreate`.

### [H6] Ajustes de la comunidad ([#21](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/21))

- Ruta `/comunidades/:id/ajustes` y permiso exacto que da acceso (creador, `can_recreate_invitation`, `can_modify_permissions`).
- Destino sin permiso (404 o H5).
- Texto del campo «Acceso» para comunidades abiertas y si la invitación aplica a abiertas.
- Reglas en una columna aquí y por sesión en H5: unificar según `RuleSetData`.
- Duración del estado «Copiado».
- Ruta `recretate` (typo) de regenerar.

### [H7] Invitación ([#22](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/22))

- Endpoint para obtener la comunidad a partir del código de invitación (el de unirse necesita el id de comunidad).
- Si los datos de la comunidad son visibles sin sesión.
- «Invitación de {nombre}»: la API solo conoce al creador.
- Frase de reglas cuando ±1/±2 no son simétricos.
- Si unirse activa la comunidad.
- Ancho de la tarjeta única y si se mantiene el `h1` del mockup.
- La pantalla no lleva SiteFooter en el mockup.

## Grandes Premios ([#6](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/6))

### [G1] Grandes Premios (calendario) ([#11](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/11))

- Ruta del listado (`/gps` con `?temporada=`) y si filtro/búsqueda van en la URL.
- Forma de la respuesta de `GET /v2/communities/{community}/{competition}/{season}/points` para sacar `pointsInGP` por GP y calcular el puesto del usuario en cada GP.
- Cómo saber qué sesiones tienen pronóstico propio sin una petición por sesión (`GET .../tipps/{community}/{user}`).
- Código/clave de la sesión sprint para el tag «Sprint» y el filtro «Con sprint».
- «Pronósticos abiertos el lunes previo»: la API no tiene fecha de apertura de pronósticos.
- Texto y estilo para GP suspendido y para «Sin fecha» (requisito 6.2, no dibujado).
- Mes del GP: ¿fecha de la carrera (`lastSessionDate`)?
- Búsqueda insensible a tildes.
- Texto de la banda cuando no quedan pronósticos pendientes y texto del vacío sin búsqueda.
- `Competition.name` vs `fullname` para «Fórmula 1».

### [G2] Fin de semana de carrera ([#12](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/12))

- Endpoint de detalle de un GP (la sección 25 solo lista `GET /v2/gps/{competition}/{season}` y `/next`).
- Zona horaria del circuito: la API no la tiene (solo `latitude`/`longitude`).
- Cuántos miembros han pronosticado una sesión aún abierta (los pronósticos ajenos solo son visibles tras el cierre, 6.8).
- Distancia total: el mockup dice 306,1 km pero 4,940 × 62 = 306,3; y unidad de `CircuitVariant.distance`.
- Forma de `pointsByPosition` en `.../calculations` para los puntos por posición de tu pronóstico.
- Ruta de la parrilla (`/{session}/grid` vs `/sessions/{session}/grid`, 24.7) y cómo usar `defineGridOf`.
- Textos no dibujados: sesión cerrada sin resultados, terminada sin pronóstico, parrilla no publicada, sin historial, tag de estado de GP pasado/futuro.
- «Pendiente» (móvil) vs «Abierta» (escritorio) para la misma sesión.
- Sesión seleccionada por defecto y si va en la URL.
- Artículo en «han pronosticado el sprint» con sesiones femeninas («la clasificación», «la carrera»).
- Texto de regla con excepciones en el GP («sin excepciones» es el único caso dibujado).

### [G3] Pronosticar ([#10](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/10))

- Forma del cuerpo de `POST .../sessions/{session}/tipps/{community}` (lista de `Prediction` con `driver` y `position`) y de la respuesta.
- Cómo se obtiene N por sesión desde `RuleSetData.predictedPositions` (¿mapa por sesión?).
- Endpoint concreto de «pilotos del GP» (25.1 lo lista sin ruta exacta) para la lista y la validación.
- Nombre corto de sesión («Clasif. sprint»): la API solo trae `RaceSession.name`.
- Generalización de los atajos: «resultado de la sesión anterior con resultados» y «mi pronóstico de {cada otra sesión}».
- Textos no dibujados: «Guardando…», diálogo de salir con cambios / cambiar de pestaña con cambios, error de plazo, cerrada sin resultados o sin pronóstico, anuncios `aria-live`, errores de validación.
- Singular «Falta 1 piloto» y concordancia de género en «Pronóstico del {sesión}», «Cierra el {sesión} en», «La {sesión} ya está cerrada».
- Umbral del tag «Pronto» y formato del subtítulo de pestaña para cierres a más de un día.
- Orden por apellido y dirección asc/desc del requisito 7.3 (el mockup solo tiene Equipo/Parrilla/Dorsal).
- Atajo de teclado de reordenación sobre el hueco enfocado (Alt+↑/↓) además de los botones.
- Recuento «8 de 12 ya han pronosticado» antes del cierre (pronósticos ajenos privados hasta el cierre).
- Posición de salida («sale P{n}») cuando aún no hay parrilla publicada.

### [G4] Parrilla y consenso ([#13](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/13))

- Segmento de ruta (`/consenso/:sesion`).
- Origen de «9 de 12 ya han pronosticado» antes del cierre.
- Denominador del consenso: miembros de la comunidad o solo quienes pronosticaron.
- Desempates en el recuento de votos y en «Apuesta más original».
- Piloto seleccionado por defecto en «Por piloto».
- Cómo distinguir sanción (alerta) de pit lane: ambos vienen de `StartGridPosition.note`.
- Ruta de parrilla (24.7) e imagen de layout de la variante.
- Distancia total 306,0 km vs 6,003 × 51 = 306,2.
- Estado «cerrada sin resultado oficial», «sin pronósticos» y «sin parrilla».
- Campo para nombres de pila en «Apuesta más original».

### [G5] Resultados y puntos ([#14](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/14))

- Ruta `/resultados/:sesion` y parámetro de vista.
- Segmentado «Momento»: el mockup lo usa para enseñar estados; en la app se deriva de los datos.
- Bonus del GP: el mockup habla de «más aciertos» y la decisión de producto es `pointsByTopScorer` = más puntos; redacción final de etiqueta, valor y frase.
- Endpoint para exactos por sesión y puntos por posición (`UserPoints.hitsBySession` vs `.../calculations` → `pointsByPosition`, `hits`).
- La tabla «Tu desglose» evalúa por piloto real y puede no sumar los puntos de la sesión; usar puntos de la API e incluir reglas 8.2.
- Texto del banner con empate de ganadores (8.4).
- Origen del recuento «N de 12 ya han pronosticado» en `pre`.
- Vista «Tu desglose» en `pre`/`open`.
- Ejemplo fijo «¿Y si VER hubiera acabado 2.º?».
- Si se muestra la vuelta rápida (position 0) en algún lugar de esta pantalla (decisión: solo se muestra).

### [G6] Simulador de puntos ([#15](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/15))

- Ruta `/simulador/:sesion` y migas (falta «Grandes Premios»).
- Si `POST .../calculations` devuelve los puntos de todos los jugadores o solo los del usuario; forma de `pointsByPosition`.
- Regla para el escenario «Caos» (en el mockup es una lista fija) y para completar «Como el sprint».
- Origen de los totales actuales (`totaluserpoints` vs `accumulatedPoints`).
- Empates en el puesto de la sesión y en la general simulada.
- Estados no dibujados: sin pronóstico propio, recalculando, sin parrilla.
- Título de la columna «Carrera» según la sesión simulada.
- Qué sesiones se pueden simular y cuándo (antes y después del resultado oficial).

## Ranking y estadísticas ([#7](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/7))

### [R0] Resumen del ranking ([#51](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/51))

- Forma de la respuesta de `GET .../{season}/points` (puntos por GP y usuario): si trae todos los GP en una llamada o hay que pedir `points/{grandprix}` por cada GP disputado.
- Criterio de «GP ganados» y puesto en el GP con empates: `UserResume.wonGrandPrixes` frente a calcularlo por `pointsInGP` (req. 8.4 dice empate compartido; el mockup no define desempate).
- Forma del usuario embebido en `UserPoints.user` (id, username, iniciales/avatar) a confirmar en API.
- Hora de cierre de la próxima sesión: no hay campo de cierre; se deriva de `RaceSession.date` − 5 min (req. 16.5).
- Slugs de ruta de las vistas (solo `evolucion/gap` aparece en el mockup).
- Texto de vacío para temporada sin GP disputados (no está en el mockup).

### [R1] Clasificación ([#52](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/52))

- «GP disputados» por jugador (columna GP «17/17»): no hay campo de participación por usuario en `UserPoints`; ¿se cuenta un GP con `pointsInGP` presente o hay que usar `participationsBySession` del `resume` de cada usuario?
- Escala del gráfico de barras expandido: máximo de la temporada o máximo teórico por GP de las reglas.
- Desempate del puesto en el GP (Vict./Podios/Forma) cuando dos jugadores empatan a puntos.
- Destino de «Ver todas las vistas» en móvil cuando `VITE_FF_GAP` está apagado.
- Slug de ruta `clasificacion/general` (propuesto).

### [R2] Puntos por Gran Premio (matriz) ([#53](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/53))

- Desempate del «Puesto en el GP» cuando dos jugadores empatan a `pointsInGP` (afecta a negrita, Vict. y escala).
- Cómo distinguir GP disputados de pendientes: `GrandPrix.hasPointsInGrandPrix` frente a presencia de `UserPoints` en ese GP.
- Persistir métrica y modo de color en la query de la URL (no definido en el mockup).
- Slug de ruta `por-gp/tabla` (propuesto).

### [R3] Mi temporada ([#54](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/54))

- `UserResume.bestGP`/`worstGP` frente a calcular mejor/peor GP por percentil como el mockup.
- Nombre visible del usuario (el esquema `User` solo tiene `username`).
- Escala Y del modo Puntos (mockup fija 0–70).
- Slug de ruta `comparar/mi-temporada` (propuesto).

### [R4] Palmarés ([#55](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/55))

- Cómo obtener las temporadas en las que participa una comunidad (no hay endpoint de «temporadas de la comunidad»; probar `totaluserpoints` por temporada de la competición).
- GP ganados acumulados de todos los jugadores en todas las temporadas: `resume` por usuario y temporada (N×M peticiones) o cálculo desde `points` de cada temporada.
- Umbral «≥ 5 GP ganados» para entrar en el medallero sin medallas: viene del mockup; confirmar con producto.
- Texto del estado vacío del medallero.
- Slug de ruta `palmares` (propuesto).

### [R5] Diferencia de puntos ([#56](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/56))

- Si `GET .../{season}/points` devuelve todos los GP de una vez o hay que pedir `points/{grandprix}` por cada GP (17+ peticiones).
- Desempate del líder en un GP con empate de acumulados (afecta a las marcas ▼).
- Estado con menos de 2 GP disputados.
- Comportamiento del eje pulsable en móvil con 17–24 GP.

### [R6] Posición en la general ([#57](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/57))

- `standings` por GP: confirmar que `UserPoints.standings` es la posición en la general tras ese GP (y `previousStandings` la del GP anterior).
- Al pasar de «Todos» (11 resaltados) a selección manual, la lista parte de 11 y solo se recorta uno: definir si se recorta a los 5 últimos.
- Tabla alternativa: el mockup no la tiene; decidir si F5 la añade aquí.
- Slug de ruta `evolucion/bump` (propuesto).

### [R7] Regularidad ([#58](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/58))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- Si la serie de «Aciertos» es `UserPoints.hitsInGP` (aciertos exactos) u otro campo.
- Jugadores sin pronóstico en algún GP: ¿cuentan como 0 en la media/sd o se excluye ese GP? (el mockup asume que todos juegan todos los GP).
- El segmentado no expone estado accesible en el mockup (falta `aria-pressed`).

### [R8] Cara a cara ([#59](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/59))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- «GP ganados» se calcula como puesto 1 por `pointsInGP` (con bonus); empates en el GP: ¿cuentan ambos como ganadores? (8.6 habla de ganador con empate compartido; la API solo da `wonGrandPrixes` en `resume`).
- GP en que uno de los dos no pronosticó: ¿0 puntos o se excluye del duelo?
- Si «Aciertos» de la comparativa es Σ `hitsInGP` o `UserResume.totalHits`.

### [R9] Distribución de puntos ([#60](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/60))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- Cubetas fijas de 0–64 con la última abierta: con reglas en que un GP da más de 65 puntos (p. ej. 110 en un fin de semana sprint con las reglas de ejemplo) conviene derivar el número de cubetas del máximo real; el umbral fijo «40» de la tabla también podría depender de las reglas.
- Mediana: el mockup toma el elemento superior en tamaño par (`a[floor(n/2)]`) en vez de promediar; confirmar si se mantiene.
- Eje de la vista por jugador: marcas «0, 15, 30, 45, 65 pts» no equidistantes en el mockup.
- GP sin pronóstico de un jugador: ¿cuenta como 0 en la distribución o se omite?

### [R10] Mapa de calor por GP ([#61](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/61))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- Máximo de aciertos por GP: el mockup usa 14 fijo («14 aciertos»); en la API debería salir de las posiciones pronosticadas de cada sesión del GP (`RuleSetData.predictedPositions`) o de `hitPercentageInGP`.
- Normalización de «Puesto en el GP» con `miembros − 1` (el mockup usa 11 fijo).
- Ganador del GP calculado como 1.º por `pointsInGP`; con empate, ¿borde dorado a todos los empatados? (8.6 dice empate compartido).
- El subtítulo «más oscuro, mejor» no se cumple en modo oscuro, donde la rampa se invierte (el mejor es el más claro).
- No hay botón «Ver como tabla» ni equivalente accesible separado; se asume que la tabla HTML es la vista accesible.
- La requisito 10.4 (mapa de calor de aciertos) y la decisión 25.2 citan `hitsInGP`: confirmar que esta pantalla sustituye a la pestaña «Ranking por aciertos» antigua.

### [R11] Aciertos por tipo ([#62](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/62))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- Claves del mapa `hitsBySession`/`hitPercentageBySession` (¿`RaceSession.code`/`key`?) y su correspondencia con «Clasif. sprint», «Sprint», «Clasificación», «Carrera».
- Intentos por tipo: posiciones pronosticadas por sesión (`RuleSetData.predictedPositions` según reglas y excepciones por GP) × GP con esa sesión; alternativa: derivar la tasa de `hitPercentageBySession`.
- ¿Cuenta como intento una sesión en la que el jugador no pronosticó?
- Si el aviso «Datos de la API: …» se muestra en producción.
- Texto «pts %» de la diferencia (puntos porcentuales): confirmar redacción («p. p.»).

### [R12] Lucha por el título ([#63](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/63))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- Máximo en juego por GP: confirmar fórmula con `RuleSetData` (posiciones pronosticadas × `pointsByEqualsPosition` por sesión + `pointsByTopScorer`) y cómo obtener las reglas de un GP futuro con excepciones por GP (8.7, 8.8).
- Cómo distinguir GP con sprint (sesiones del GP vía `GrandPrix.sessions` / `RaceSession.code`).
- Tope 70 de la barra y del umbral «Casi imposible» está fijo en el mockup; debería derivarse de las reglas (máximo de un GP).
- Plural: «1 jugadores aún pueden ser campeones» cuando vivos = 1; y «−0» cuando un perseguidor empata con el líder.
- GP suspendidos (`GrandPrix.suspended`) no deben contar como pendientes.
- Comportamiento con temporada cerrada o con menos de 5 GP disputados.

### [R13] Puntos por sesión ([#64](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/64))

- Slug de sección/vista de la ruta (solo existe el ejemplo `evolucion/gap`).
- Forma exacta de `GET /v2/communities/{community}/{competition}/{season}/points` (si trae la matriz usuario×GP o hay que pedir `points/{grandprix}` por GP).
- Nombre visible del jugador: la API solo da `User.username` (el mockup usa nombre completo y nombre de pila).
- Cómo saber que un GP está disputado (¿`GrandPrix.hasPointsInGrandPrix`?).
- Claves del mapa `pointsBySession` (¿`RaceSession.code`?) y si `pointsInGP` = Σ `pointsBySession` + `bonusPoints`.
- Escala Y fija 0–70 del gráfico «Tu temporada»: con sprint un GP puede superar 70 puntos según reglas; derivar del máximo real.
- Formato «42%» (sin espacio) en el reparto frente a «42 %» en el resto de pantallas.
- Si el aviso «Datos de la API: …» se muestra en producción.
- Falta tabla alternativa / «Ver como tabla» en el mockup.

## Perfil y ajustes ([#8](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/8))

### [U1] Mi perfil ([#42](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/42))

- Nombre visible («Álex Ruiz») separado de `username`: `User` no tiene campo de nombre.
- Nivel, nombre del nivel («Estratega») y XP («1.840 / 2.200 XP»): no existen en `UserRank` ni `UserResume`.
- «Campeón {año}»: requiere `resume` de temporadas anteriores por comunidad; confirmar endpoint y coste.
- Total de posiciones pronosticadas («de 221 posiciones») para el % de aciertos.
- Historial: confirmar que `totaluserpoints` de temporadas pasadas devuelve el campeón ordenado.
- Si toda la tarjeta «Tu temporada» va tras `VITE_FF_MY_SEASON` o solo el enlace.
- Percentil en «Tus comunidades» tras `VITE_FF_COMMUNITY_PERCENTILE`.
- Contador de notificaciones sin leer en móvil (no hay bandeja en la API, ver U4).
- Enlace a Administración en el perfil móvil para admins (lo pide Navegacion, no está en PerfilMovil).
- Ruta de Ajustes (`/ajustes`) a fijar en T3.
- Clase `.hero` del mockup aplica el degradado de marca a la tarjeta (contraste roto).

### [U2] Perfil de otro usuario ([#43](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/43))

- Parámetro de la ruta `/u/:usuario`: id o username.
- Concordancia de género (`User.gender`): valores posibles y texto por defecto.
- «Campeona {año}» y «Nivel 8 · Maestra de estrategia»: no hay datos en `UserRank`/`UserResume`.
- Lectura de comunidades de otro usuario (`GET /v2/user/{user}/communities`) para «Comunidades en común».
- Texto del KPI «Puntos» cuando el usuario no es líder.
- Comportamiento si el usuario no pertenece a la comunidad activa.

### [U3] Ajustes de cuenta ([#44](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/44))

- Ruta `/ajustes` (no está en el mapa de rutas del canvas).
- Campo «Nombre» (no existe en `User`) y si «Nombre de usuario» es editable con `PATCH /v2/user/{user}`.
- Límite de 160 caracteres de la bio.
- Flujo de cambio de correo con código de confirmación.
- «Cerrar las demás»: si el `DELETE` de todos los tokens excluye el actual.
- Campo donde llega el usuario de Telegram vinculado y diseño del estado «no vinculado».
- Guardado de avisos en móvil (no hay SaveBar ni botón).
- BottomSheets de cambiar correo y contraseña en móvil (no diseñadas).
- Secciones de privacidad y nombres de equipos (3.4 y 3.7).

### [U4] Notificaciones ([#45](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/45))

- No existe endpoint de histórico de notificaciones ni de estado leído/no leído en la API v2 (14.2, 14.5): la pantalla queda bloqueada.
- Ruta `/notificaciones`.
- Grupos de fecha posteriores a «Esta semana».
- Ocultar enlaces a Notificaciones mientras no haya datos.

## Administración ([#9](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/9))

### [M6] Circuitos (admin) ([#34](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/34))

- Qué variante aporta la «Longitud» cuando `Circuit.variants` tiene más de una, y la unidad de `CircuitVariant.distance` (m o km).
- Borrado de circuito (`DELETE /v2/circuits/{circuit}`, requisito 12.5): el mockup no tiene botón; decidir si va en M7.
- Orden del listado (el mockup no es alfabético) y si hace falta buscador como en 11.1.
- Texto del estado vacío y del valor sin variantes («—»).

### [M7] Editar circuito ([#35](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/35))

- `Circuit` no tiene zona horaria: confirmar dónde se guarda el valor del select «Zona horaria».
- «Imagen del trazado»: logo del circuito (`hasLogoImage`) o layout de la variante (`hasLayoutImage`), y endpoints exactos de subida/borrado.
- Columna «Vueltas»: `CircuitVariant` solo tiene `turns` (curvas); las vueltas son de `GrandPrix.laps`.
- Formulario de variante (alta/edición/borrado) no dibujado.
- Campos `latitude`/`longitude` y borrado del circuito no aparecen en el mockup.
- Textos del modo alta, del toast de guardado y del vacío de variantes.

### [M8] Pilotos y equipos ([#36](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/36))

- Formularios de alta/edición de piloto y de equipo, y borrado (no dibujados).
- Contenido de la pestaña «Equipos» (no dibujado).
- Color de la barra: `Driver.color` o `Constructor.teamcolor`.
- Qué competición/temporada se administra (no hay selector) y si se distingue piloto global (`/v2/drivers`) de piloto en temporada.
- Orden de la tabla y texto para piloto sin equipo.

### [M9] Reglas de puntuación ([#37](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/37))

- Forma de `RuleSet.data`: un `RuleSetData` único o uno por sesión (el mockup muestra valores y `predictedPositions` distintos por sesión).
- Origen de las columnas de sesión («Clasif. sprint», «Sprint», «Clasificación», «Carrera»).
- Forma de `GET /v2/rulesets/{id}/usages` y de las excepciones por GP; si el número de usos de la lista exige una petición por conjunto.
- `RuleSet.creator`: objeto o id.
- Si `predictedPositions` se edita al crear.
- Textos del modal de borrado, del vacío de usos y del vacío de lista.

### [M10] Usuarios (solo lectura) ([#38](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/38))

- Número de comunidades por usuario: no viene en `User`.
- Búsqueda y paginación en servidor en `GET /v2/user` (el mockup muestra 12 de 312).
- Texto y estilo del estado no verificado.
- Detalle de usuario (12.13): enlazar a U2 o vista propia.
- Si `User` tiene nombre visible además de `username`.

### [M11] Comunidades (solo lectura) ([#39](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/39))

- `Community.defaultRuleSet`: forma (id u objeto con `displayname`).
- Si el admin puede abrir H5 de una comunidad de la que no es miembro.
- Si `GET /v2/communities` devuelve todas (incluidas cerradas) o hace falta paginar.
- Orden y textos de vacío.

### [M12] Enviar notificaciones ([#40](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/40))

- Endpoint para enviar un aviso manual (no está en la sección 25).
- Si «Cambios en la parrilla» se envía desde aquí o solo con `PATCH .../grid/notification` en M5.
- Recuento de destinatarios («Llegará a 287 usuarios») y de vinculados a Telegram («164 vinculados»): no hay datos en la API.
- Estado de los envíos automáticos: no hay endpoint; texto fijo.
- Textos del modal de confirmación, del toast y del canal desactivado.

### [M13] Cálculo de puntos ([#41](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/41))

- Endpoint real de recálculo para todas las comunidades (el de 8.11 es por comunidad y se describe como simulación; `recalculate` deprecado).
- Historial «Últimos cálculos»: no hay endpoint.
- Opción «toda la temporada» que menciona el subtítulo.
- Criterio para listar solo GP con resultados.
- Textos de confirmación, estado «En curso» y vacíos.

### [M1] Panel de administración ([#46](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/46))

- Nº de pronósticos de la próxima sesión entre todas las comunidades (no hay endpoint global).
- Registro del «Último cálculo» (fecha, comunidades, duración).
- Dimensiones y formato de la imagen promocional (la API solo da `hasPromoImage`).
- Reglas para generar «Próximas tareas».
- Coste de `GET /v2/user` completo para el KPI de usuarios.

### [M2] Grandes Premios (admin) ([#47](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/47))

- Estado «Publicado/Borrador» (visibilidad) sin campo en la API; «Suspendido» no aparece en el mockup.
- Formato Sprint/Normal: derivado de los códigos de sesión.
- Coste de pedir pilotos y resultados de cada GP para la columna de preparación (N peticiones).
- Fecha mostrada (última sesión o primera).
- Paginación de la tabla.
- Textos de vacío.

### [M3] Editar Gran Premio ([#48](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/48))

- Visibilidad «Publicado/Borrador»: no hay campo en `GrandPrix`.
- Endpoint de edición del GP (25.1 solo lista `POST /v2/gps/`).
- «Fin de semana con sprint»: no es un campo del GP.
- Suspensión del GP (`suspended`, 12.8) no está en el mockup.
- Borrar imagen promocional (12.8) no está en el mockup.
- Columna «Pilotos» de sesiones depende del conjunto de reglas de cada comunidad.
- Zona horaria del circuito para «Inicio (hora local)».
- Cómo saber si una sesión está «calculada».
- Comportamiento del modo alta.

### [M4] Pilotos del Gran Premio ([#49](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/49))

- La API de pilotos del GP no guarda el equipo por GP: cómo persistir la asignación a huecos de equipo.
- Total esperado (22 = 2 × equipos) como regla fija.
- No hay endpoint de clonado: se hace en cliente (GET del otro GP + POST/DELETE).
- Selección inicial y destino tras guardar.
- Contraste del texto blanco sobre colores de equipo claros.

### [M5] Sesiones y resultados ([#50](https://github.com/zugazagoitia/Vivecoded-Prognosports/issues/50))

- Zona horaria del circuito (no está en `Circuit`).
- Duración de la sesión (no está en `RaceSession`).
- Qué sesiones «tienen pronóstico» y cuántos pilotos se pronostican (depende del conjunto de reglas de cada comunidad).
- Campos `hasGrid`, `hasFastLap` y `defineGridOf` ausentes del panel de sesión.
- `PUT` de sesión con parámetro `session` fuera de la ruta y ruta de la parrilla (24.7).
- Estado «Borrador»/publicada de la parrilla y selector de sesión de la parrilla.
- Si guardar resultados calcula los puntos en backend o hay que llamar a `calculations` por comunidad.
- Nº de posiciones del resultado (N).
- Inicio de la ventana visible de la línea temporal.
