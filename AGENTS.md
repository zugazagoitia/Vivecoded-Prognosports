# Instrucciones para agentes

Frontend nuevo de PrognoSports: Vue 3.5 (`<script setup lang="ts">`), Vite, TypeScript estricto y pnpm. Despliegue en Cloudflare Workers (Static Assets). El backend y la API v2 **no** están aquí y **no se modifican** desde este proyecto (`docs/requisitos.md` §1 y §18). Si algo del backend falla, se reporta (ver abajo), no se arregla aquí.

## Mapa de documentación

Lee solo lo que necesites; cada tema tiene su documento.

| Si necesitas…                                                            | Ve a                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Arrancar, scripts, variables de entorno, stack, flujo de ramas           | `README.md`                                                                       |
| Índice de toda la documentación                                          | `docs/README.md`                                                                  |
| Escribir o depurar tests (unitarios, e2e, capturas, fixtures, cobertura) | `docs/testing.md`                                                                 |
| Workflows, `ci-ok`, Dependabot, cobertura, promoción `develop -> master` | `docs/ci.md`                                                                      |
| Cloudflare, entornos, secretos, rollback, Sentry, presupuesto de bundle  | `docs/deploy.md`                                                                  |
| CSP, cabeceras, token de sesión                                          | `docs/security.md` (la CSP vive en `public/_headers`)                             |
| Usar un backend local sin secretos                                       | `docs/local-backend.md`                                                           |
| Feature flags (`VITE_FF_*`, panel)                                       | `docs/feature-flags.md`                                                           |
| API real frente a la spec, workarounds, reportes al backend              | `src/api/README.md` y `docs/contract-tests.md`                                    |
| Qué debe hacer una pantalla/pieza                                        | `docs/design/issues/issues/<código>.md` (p. ej. `G3.md`)                          |
| Decisiones de producto ya tomadas / por confirmar                        | `docs/design/issues/a-confirmar.md` (resumen al inicio)                           |
| Requisitos y decisiones técnicas originales                              | `docs/requisitos.md` (planificación inicial; el estado vigente está en los demás) |

## Cómo trabajamos

- **Idioma:** la interfaz, los mensajes de error, los issues y los PRs van en **español**. Cadenas de UI en `src/i18n/es/` (no texto suelto en componentes). Código y nombres de identificadores en inglés.
- **Un issue/épica, una rama:** ramas `zugazagoitia/<tema>` o `docs/<tema>`, creadas desde `develop`. Los issues de diseño están en `docs/design/issues/`; implementa exactamente lo que dicen (y marca como «por confirmar» lo que no esté definido en vez de inventarlo).
- **Ramas:** `develop` (integración, despliega beta) y `master` (producción, con aprobación). **Los PR van siempre a `develop`.** Nunca hagas push directo a `develop` ni a `master`.
- **Release:** `promote-to-master.yml` mantiene una PR abierta `develop -> master` («Develop»); **esa** PR se fusiona con _merge commit_ (nunca squash) para compartir historia (`docs/ci.md`).
- **Merge:** los PR de feature se fusionan por _squash_, así que `develop` no comparte historia con las ramas de feature. Para actualizar una rama con `develop` **no** hagas `git merge origin/develop` (todo parece conflicto «add/add»). Fusiona en su lugar las **ramas originales** de las que depende (comparten historia real), resuelve los conflictos de verdad, y cierra con `git merge -s ours origin/develop` para dejar constancia en el historial. Comprueba antes con `git merge-tree --write-tree origin/develop HEAD` si habrá conflictos.
- **Worktrees:** cada rama de trabajo suele tener su propio worktree. Ejecuta los comandos desde el worktree de la rama. **Tras cambiar de rama o hacer merge, ejecuta `pnpm install --frozen-lockfile`**: un `node_modules` desactualizado produce errores de tipos falsos (p. ej. en el hook de pre-push).
- **Commits:** mensajes cortos en imperativo (inglés, como el historial). El hook `pre-commit` (lefthook) ejecuta oxlint, eslint y prettier sobre los ficheros staged; `pre-push` ejecuta `pnpm typecheck`. No uses `--no-verify`. No añadas la línea `Co-Authored-By` (decisión del propietario) y no firmes los commits (`git -c commit.gpgsign=false commit`).
- **Acciones hacia fuera** (push, abrir/cerrar PR, crear issues, cambiar ajustes de repos, desplegar): hazlas solo cuando el usuario las pida o estén dentro de lo que pidió, y di qué has publicado y dónde. No fuerces pushes ni borres ramas ajenas.

## Comandos habituales

```sh
pnpm install --frozen-lockfile
pnpm dev                       # desarrollo (VITE_API_MOCK=true pnpm dev usa MSW)
pnpm typecheck                 # app, node y e2e
pnpm lint && pnpm format:check
pnpm test                      # Vitest (unitarios, junto al código: *.test.ts)
pnpm build                     # typecheck + build de producción
pnpm size                      # presupuesto de bundle (tras build)
pnpm e2e                       # build + Playwright
pnpm test:contract             # contrato contra la API real (solo lecturas)
pnpm api:drift                 # compara /openapi publicado con api/openapi.json
```

Antes de dar algo por terminado: `pnpm typecheck`, `pnpm lint`, `pnpm test` y los e2e que toquen tu cambio.

## CI (`.github/workflows/ci.yml`)

Jobs: `lint`, `typecheck`, `test`, `coverage` (informativo), `audit`, `build (beta|production)`, `size`, `e2e` y `ci-ok`. El job `e2e` es el workflow reutilizable `.github/workflows/e2e.yml` (matriz completa en cada PR y push, **dentro** de CI). **`ci-ok` agrega todos los jobs salvo `coverage` y es el único check obligatorio**, también para `master`; no existe un `e2e-ok` aparte. CodeQL va aparte (`codeql.yml`). Un PR no se fusiona sin `ci-ok` en verde. `deploy.yml` arranca cuando CI termina (`workflow_run`), así que el despliegue espera también a los e2e (~13 min de reloj; WebKit es el más lento).

- Si CI falla, **reproduce en local con las mismas condiciones** antes de tocar nada, y distingue si el fallo lo causa tu rama o ya existía en `develop`.
- El job `coverage` sube la cobertura a GitHub Code Quality y mantiene un comentario único en el PR; nunca bloquea (`docs/ci.md#cobertura`).
- **Variables de CI sin definir llegan como cadena vacía** (`VITE_SENTRY_DSN: ${{ vars.X }}` → `""`). El esquema de `src/env.ts` trata `""` como «no definido» en las variables opcionales; mantén esa norma al añadir variables.
- Acción compuesta `.github/actions/setup` (tras `checkout`): pnpm + Node + `pnpm install --frozen-lockfile`. Los jobs que no instalan dependencias no deben usar `cache: pnpm` (el post-step falla): usa `install: 'false'`.
- Dependabot (semanal, hacia `develop`, sin auto-merge) y reglas de workflows (permisos mínimos, acciones fijadas por SHA): `docs/ci.md`. Las subidas de Playwright exigen actualizar la imagen de `e2e:update:linux` y regenerar capturas.

## E2E (Playwright)

- Se prueba el `dist/` construido con `vite preview` (nunca el servidor de desarrollo), con la API **siempre mockeada** (`e2e/support/api.ts`, `page.route`). Proyectos: `chromium`, `firefox`, `webkit`, `mobile` y `flags-off`.
- **Las capturas (`toHaveScreenshot`) son solo de Chromium** (proyectos `chromium` y `mobile`, que usa el motor Chromium). En specs que corren en todos los navegadores, salta o devuelve antes de la captura si `browserName !== 'chromium'`.
- **Las referencias (`e2e/__screenshots__/`) deben generarse en Linux**, igual que CI; las de macOS fallan en CI por fuentes y antialiasing. Usa `pnpm e2e:update:linux` (Docker con `mcr.microsoft.com/playwright:v1.64.0-noble`; la versión debe coincidir con `@playwright/test`). Si el demonio de Docker no está activo, arráncalo (`orbctl start`). Nunca subas referencias generadas en macOS.
- **CI rápido** (`.github/workflows/e2e.yml`, invocado desde `ci.yml`): un job `build` compila `dist/` una vez (flags activos) y lo sube como artefacto `e2e-dist`; los jobs de la matriz lo descargan (no ejecutan `vite build`). Matriz completa siempre: `chromium` (2 shards `--shard=1/2`, `2/2`), `mobile`, `flags-off`, `firefox` y `webkit`, con 1 reintento y `--max-failures=20` solo en PR. Los navegadores de Playwright se cachean por versión.
- **Capturas**: en specs con tema claro/oscuro, axe y overflow se comprueban en ambos, pero `toHaveScreenshot` solo en claro (`if (scheme === 'light')`), más oscuro en una pantalla clave por área. Una referencia por estado de pantalla; no añadas capturas oscuras sin motivo.
- Para validar como CI: `CI=1 pnpm exec playwright test --workers=2` (2 workers, 1 reintento). Bajo carga alta pueden fallar tests de Firefox/WebKit que pasan en solitario; revisa antes de dar un fallo por real.
- Tras un merge con conflictos en `__screenshots__`, toma cualquiera de las versiones y **regenera todas** en Linux; no resuelvas PNG a mano.
- Todo componente nuevo debe pasar axe (`expectNoSeriousA11yViolations`) en claro y oscuro.
- Los e2e se construyen con los 12 feature flags activados (como producción) y existe un proyecto `flags-off` para el caso apagado (`pnpm build:e2e`). Más detalle: `docs/testing.md`.

## Tests unitarios (Vitest)

- `*.test.ts` junto al código; MSW (`src/test/setup.ts`) falla ante peticiones sin handler. Monta componentes con `renderWithProviders` (`src/test/render.ts`) y consulta por rol/texto (Testing Library).
- Las aserciones de texto usan las cadenas de `src/i18n/es/`. Cobertura (≥90 %) exigida solo a la lógica de dominio (`vite.config.ts`).

## Contrato de la API y mocks

- La API real difiere de la spec en varios puntos (`src/api/README.md`, `corrections.contract.ts`). **Los mocks y fixtures deben usar la forma real** de la API, no la de la spec, o los tests no detectan los fallos (así se coló `verified_at` frente a `verified`, issue #95).
- Todas las respuestas pasan por los esquemas Zod de `src/api/schemas.ts`; ante un campo nuevo o con otro nombre, acepta ambas formas y normaliza al modelo de la app.
- Los errores de negocio de la API llegan como HTTP 200 con `success:false`; el cliente (`src/api/client.ts`) los convierte en `ApiError`. Quirks ya resueltos en el cliente (sesión caducada = HTTP 200 → 401/403; `tipps` como mapa por usuario; `PUT` de pilotos por constructor; `PATCH /user` con contraseña actual y `preferences['time-zone-id']`, etc.): lista y estado en `src/api/README.md`; no los «arregles» en pantallas.

## Seguridad y despliegue

- CSP y cabeceras en `public/_headers` (`docs/security.md`). Un host nuevo (API, teselas, analítica, Sentry) requiere ampliar `connect-src`/`img-src`/`script-src` ahí. Sin `unsafe-inline`: nada de scripts o estilos en línea.
- Ningún secreto en el repo ni en el bundle (`scripts/check-dist-secrets.sh`). Los tokens de Cloudflare viven en secretos de entorno de GitHub, no del repositorio.
- Despliegue: `deploy.yml` (vía `workflow_run` tras CI, y por tanto tras los e2e) publica `dist-beta`/`dist-production` ya construidos; `develop` -> beta, `master` -> producción con aprobación. Ver `docs/deploy.md`. No reconstruyas en el job de deploy.
- Respeta el presupuesto de bundle (`.size-limit.json`, `scripts/bundle-budget.ts`). Los gráficos son SVG propios; no hay ECharts ni MapLibre (si se añadieran, solo en chunks perezosos).
- Feature flags: los 12 `VITE_FF_*` están **activados** en `.env.beta` y `.env.production` y apagados en `.env`; ver `docs/feature-flags.md`.

## Reportar problemas del backend o del contrato de la API

El backend vive en **`Cadiducho/PrognoSports`** (privado, Issues activados). Si encuentras que la API real no coincide con la spec (`https://api.prognosports.com/openapi`, copia en `api/openapi.json`) o que el backend falla:

1. **Confírmalo contra la API real**, no solo con los mocks: los mocks (MSW, `e2e/support/api.ts`) pueden reflejar la spec y ocultar el fallo. Pruebas públicas con `curl`/`fetch` sin token; las rutas con sesión, con la cuenta de prueba (ver abajo). Para validar contra los esquemas de la app, usa `pnpm test:contract` (`docs/contract-tests.md`).
2. **Deja constancia en este repo** antes de reportar:
   - Discrepancia de contrato: añádela a `src/api/README.md` (sección «Discrepancias») y, si es verificable sin token, vigílala en `src/api/contract/corrections.contract.ts` (pasa mientras exista y falla con instrucciones cuando se corrija).
   - Workaround en el cliente: documéntalo junto al código (por qué existe y cuándo se puede quitar).
   - Crea también un issue en este repo (`bug`, más el `area:*` que corresponda) si afecta al producto.
3. **Busca duplicados** en el backend:
   ```sh
   gh issue list -R Cadiducho/PrognoSports --state all -S "<palabras clave>"
   ```
   Si existe, comenta ahí en lugar de abrir otro.
4. **Crea el issue en el backend** (en español, como los demás de ese repo). Etiquetas existentes: `bug`, `enhancement`, `api`, `server`, `database`, `frontend`, `dependencies`. Para contrato usa `bug` + `api`.
   ```sh
   gh issue create -R Cadiducho/PrognoSports --title "..." --label bug --label api --body-file <fichero.md>
   ```
   Escribe el cuerpo en un fichero (usa el directorio scratchpad, nunca el repo) y pásalo con `--body-file`.
5. **Enlaza en ambos sentidos**: cita en el issue del backend el issue/PR de este repo y deja un comentario en el de este repo con la URL del backend.

### Qué debe llevar el issue del backend

- **Resumen** y gravedad (qué rompe en el frontend).
- Por cada problema: **spec vs. API real** (ruta, campo, tipo), **evidencia** (respuesta real recortada, solo forma y valores no sensibles) y **cómo solucionarlo** (corregir el código o la spec, indicando cuál se propone y por qué).
- Cambios incompatibles: proponer un periodo de transición con ambos nombres.
- **Cómo verificar la corrección**: `pnpm api:drift` y `pnpm test:contract`.
- Agrupa los hallazgos relacionados en un solo issue con secciones numeradas, en vez de uno por campo.

Ejemplo: `Cadiducho/PrognoSports#226` (spec OpenAPI vs. respuestas reales; `verified_at` frente a `verified`).

### Reglas de seguridad

- **Nunca** pegues en un issue tokens, contraseñas, correos reales, JWT ni respuestas completas con datos personales. Redacta o muestra solo la forma (nombres de campo y tipos).
- La cuenta de prueba está en `.env.test.local` (ignorado por git; `TEST_ACCOUNT_EMAIL`, `TEST_ACCOUNT_PASSWORD`). Úsala solo para lecturas, cárgala sin imprimirla (`set -a; . ./.env.test.local; set +a`) y no la copies a ficheros versionados, logs ni issues.
- No hagas peticiones de escritura contra la API de producción salvo que el usuario lo pida expresamente.
- Reportar es una acción hacia fuera del repo: hazlo cuando el usuario lo pida o cuando el hallazgo ya esté confirmado, y dile qué has publicado y dónde.
