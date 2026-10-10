# Despliegue (T12)

Cloudflare Workers con Static Assets, plan gratuito, URLs `workers.dev`, sin DNS (docs/requisitos.md §22).

| Origen                    | Destino                                | Workflow                                         | Aprobación                      |
| ------------------------- | -------------------------------------- | ------------------------------------------------ | ------------------------------- |
| PR del mismo repo         | Worker `prognosports-pr-<n>` (preview) | `deploy.yml` (job `preview`)                     | No                              |
| Push a `develop`          | Worker `prognosports-beta`             | `deploy.yml` (job `beta`)                        | No (entorno `beta`)             |
| Push a `master`           | Worker `prognosports`                  | `deploy.yml` (job `production`)                  | Sí (entorno `production`)       |
| Cierre de PR              | Borra `prognosports-pr-<n>`            | `deploy-preview-cleanup.yml`                     | No                              |

Los despliegues nunca reconstruyen: descargan el artefacto `dist-beta` (PR y `develop`; trae `VITE_PREVIEW=true`) o `dist-production` (`master`) del run de CI que acaba de pasar (contrato en la cabecera de `.github/workflows/ci.yml`).

## Cómo funciona y por qué es seguro

- `deploy.yml` se dispara con `workflow_run` al terminar CI con éxito. Corre con el YAML de la rama por defecto y tiene acceso a secretos, por eso no ejecuta código de la PR: instala dependencias del lockfile de la rama por defecto (PR) o de la rama desplegada (`develop`/`master`), con `--ignore-scripts`, y solo despliega el `dist/` ya construido.
- Previews solo si `head_repository == repository`: las PRs de forks nunca reciben secretos ni preview.
- Los secretos se inyectan solo en el paso de wrangler, vía entornos de GitHub. Permisos mínimos por job; `permissions: {}` a nivel de workflow.
- Concurrencia: un preview por PR (cancela el anterior), `deploy-beta` y `deploy-production` en serie sin cancelar.
- Tras cada despliegue corre `scripts/smoke-deploy.sh <url>` (estado y cabeceras de `/`, ruta profunda y asset con hash).
- Todas las acciones están fijadas por SHA (las mismas que `ci.yml`). Wrangler es una devDependency con versión exacta (`4.149.0`); se actualiza con PR (Renovate/Dependabot) y no con `latest`.

### Decisión: Worker por PR en lugar de `versions upload`

El requisito §22.3 prefiere `wrangler versions upload`, pero (a) no se pudo verificar sin credenciales que la URL de preview por versión exista en el plan Free, y (b) Wrangler 4.149.0 no tiene comando para borrar versiones, así que el criterio «cerrar una PR elimina su preview» no sería cumplible. Se usa la alternativa documentada: `wrangler deploy --name prognosports-pr-<n>` y `wrangler delete` al cerrar. Por eso `wrangler.jsonc` tiene `preview_urls: false`. El plan Free permite hasta 100 Workers por cuenta; con el borrado al cerrar no se acumulan.

## Cabeceras y caché (`public/_headers`)

Workers Static Assets admite `_headers` (verificado en local con `wrangler dev` 4.149.0). Vite copia `public/_headers` a `dist/_headers`.

- `/assets/*` (ficheros con hash): `public, max-age=31536000, immutable`.
- `/` y `/index.html`: `no-cache`.
- Rutas profundas (fallback SPA): Static Assets les pone `public, max-age=0, must-revalidate` por defecto (equivalente en la práctica a `no-cache`; no hay regla que case con ellas sin afectar a `/assets/*`).
- Las cabeceras de `_headers` solo se aplican a respuestas de assets. Sin Worker propio es suficiente.
- **Hook para T13**: añadir en `public/_headers` un bloque `/*` con `Content-Security-Policy` y demás cabeceras de seguridad (hay un comentario con el lugar). Límites: 100 reglas, 2.000 caracteres por línea. Si una cabecera de `/*` coincide con otra de una regla específica, Cloudflare las une (no las sustituye): evitar duplicar `Cache-Control` en `/*`.

## Configuración única (propietario)

### 1. Cloudflare

1. Crear cuenta gratuita en <https://dash.cloudflare.com> (no se necesita dominio ni tarjeta).
2. Registrar el subdominio `workers.dev` de la cuenta (Workers & Pages → Overview → «Your subdomain»). Es obligatorio antes del primer despliegue.
3. Anotar el **Account ID** (Workers & Pages → panel derecho, o URL del dashboard).
4. Crear un **API token personalizado** (My Profile → API Tokens → Create Token → Create Custom Token) con **solo**:
   - Account → **Workers Scripts** → **Edit**
   - Account Resources: Include → solo esta cuenta. Sin permisos de Zone ni User. Sin TTL excesivo (rotar cada 6-12 meses).
   - No usar la plantilla «Edit Cloudflare Workers» (incluye KV, rutas, zonas y más).
   - Por verificar en el primer despliegue real: si Wrangler falla por un permiso que falta (p. ej. al habilitar `workers.dev`), el error indica cuál; añadir solo ese.

### 2. GitHub: ramas

El repositorio hoy solo tiene `master`. Crear `develop` desde `master` (`git branch develop master && git push -u origin develop`). `develop` es la rama de integración (→ beta); `master` es producción.

Protección de ramas (Settings → Branches o Rulesets) para `develop` y `master`:

- Require a pull request before merging; require status check **`ci-ok`** (el check estable de CI); require branches up to date.
- Bloquear force-push y borrado.
- Recomendado: `master` solo se actualiza mediante PR de `develop` a `master`.
- Importante: `deploy.yml` debe existir en la **rama por defecto** (`master`) para que `workflow_run` lo dispare. Mientras no esté fusionado en `master`, no se desplegará nada.

### 3. GitHub: entornos y secretos

Settings → Environments. Crear tres entornos y, en **cada uno**, los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (Environment secrets, no repository secrets):

| Entorno      | Protección                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `preview`    | Ninguna.                                                                                                   |
| `beta`       | Ninguna.                                                                                                   |
| `production` | **Required reviewers**: tú (y quien corresponda). Activar «Prevent self-review» si hay más de un revisor. |

Notas:

- Con `workflow_run` el job corre sobre la ref de la rama por defecto, así que las «Deployment branches» de los entornos no distinguen `develop` de `master`: la separación la hacen los `if:` de `deploy.yml` (rama del push y repositorio de origen). No restringir los entornos a `develop` o los despliegues fallarán. Se puede restringir `production` a `master`.
- Se pueden usar tokens distintos por entorno (recomendado: uno para `production`).
- Settings → Actions → General: «Fork pull request workflows» → exigir aprobación para todos los colaboradores externos; permisos por defecto del `GITHUB_TOKEN` en «Read repository contents».
- Nunca crear secretos de Cloudflare a nivel de repositorio.

### 4. Primer despliegue

1. Fusionar este trabajo en `master` y crear `develop`.
2. Push/PR a `develop` → `prognosports-beta` se crea solo. URL: `https://prognosports-beta.<subdominio>.workers.dev`.
3. PR de `develop` a `master` → tras CI aparece el job `production` esperando aprobación; aprobar en la pestaña Actions.

## Rollback

Cada `wrangler deploy` crea una versión y la activa. Volver a una anterior no reconstruye nada.

Desde la terminal (con `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` exportados):

```sh
pnpm exec wrangler versions list --name prognosports     # últimas 10 versiones (id, fecha, mensaje con el SHA)
pnpm exec wrangler rollback <version-id> --name prognosports -m "motivo"
pnpm exec wrangler deployments list --name prognosports  # comprobar la versión activa
```

Desde el panel: Workers & Pages → `prognosports` → Deployments → elegir la versión anterior → «Rollback to this version».

Notas:

- Para beta usar `--name prognosports-beta`.
- El mensaje de cada versión lleva el SHA del commit (`production @ <sha>`).
- El rollback no cambia git: abrir un PR de revert en `master` para que el siguiente despliegue no vuelva a publicar la versión mala. Un nuevo push a `master` despliega de nuevo lo que haya en `master`.
- Los rollbacks de assets son inmediatos; la caché `immutable` no afecta porque los nombres con hash cambian.
- **Pendiente (T12)**: probar el procedimiento una vez en beta tras el primer despliegue y anotar la fecha aquí.

## Verificación manual tras desplegar

```sh
scripts/smoke-deploy.sh https://prognosports-beta.<subdominio>.workers.dev
```

## Límites para no gastar

Solo Workers con Static Assets, `wrangler deploy`, `workers.dev` y GitHub Actions. No usar KV, D1, R2, Durable Objects, Queues ni Workers Paid; sin dominio propio. Las peticiones a assets estáticos son gratuitas e ilimitadas; no hay código de Worker, así que no se consumen las 100.000 peticiones diarias de Workers.

## Observabilidad y presupuesto de rendimiento (T14)

### Errores (Sentry, inerte por defecto)

- Se activa solo si `VITE_SENTRY_DSN` está definido (el DSN es público) y el modo no es `development`/`test`. `@sentry/browser` se carga con `import()` perezoso: sin DSN no entra nada en el bundle principal ni se hace ninguna petición.
- Configuración: `dataCollection` sin usuario, cookies, cabeceras, cuerpos ni query params (equivale a `sendDefaultPii: false`, retirado en el SDK v11), `release = VITE_GIT_SHA`, `environment = modo` (`beta`/`production`), sin trazas. `beforeSend` elimina usuario, cookies, cabeceras y cuerpos de petición y limpia emails, JWT, `Bearer` y parámetros `token=`/`code=` (`src/lib/scrub.ts`).
- Integración: `setErrorReporter` (ErrorBoundary y `reportError` de T7) y el evento `contract-error` de T2 (solo ruta y códigos/rutas de issue, nunca valores).
- Source maps: en CI, con `SENTRY_AUTH_TOKEN` (secreto) y `SENTRY_ORG`/`SENTRY_PROJECT` (variables), Vite genera maps `hidden`, el plugin los sube y los borra de `dist/`. Sin token no se generan maps.
- CSP (T13): `connect-src` debe permitir el host de ingestión del DSN (p. ej. `https://*.ingest.sentry.io`, o `https://*.ingest.de.sentry.io` en la región UE).

### Métricas

Cloudflare Web Analytics (sin cookies, incluye Core Web Vitals): se inyecta el beacon solo si `VITE_CF_ANALYTICS_TOKEN` está definido. CSP: `script-src https://static.cloudflareinsights.com` y `connect-src https://cloudflareinsights.com`. Alternativamente, activar la inyección automática desde el panel de Cloudflare (entonces no hace falta el token).

### Presupuesto de tamaño (`pnpm size`, job `size` de CI)

Tras `pnpm build`, `pnpm size` ejecuta:

| Control | Umbral | Dónde cambiarlo |
| --- | --- | --- |
| JS inicial `dist/assets/index-*.js` (gzip) | 150 kB (hoy ~105 kB) | `.size-limit.json` |
| CSS inicial (gzip) | 20 kB (hoy ~1 kB) | `.size-limit.json` |
| Cada chunk de ruta (gzip) | 80 kB | `ROUTE_LIMIT` en `scripts/bundle-budget.ts` |
| Chunks cuyo nombre contenga `echarts`/`maplibre`/`zrender` | 250 kB | `HEAVY_LIMIT` en `scripts/bundle-budget.ts` |
| ECharts/MapLibre en el grafo inicial (index.html + modulepreload) | prohibido | `HEAVY_CODE` en `scripts/bundle-budget.ts` |

Los umbrales son la propuesta de §20.8 (pendiente de confirmar); suben o bajan editando esos ficheros en un PR revisado. `pnpm analyze` genera `reports/bundle.html` (treemap); CI lo sube como artefacto `bundle-report-<modo>`.

### Imágenes

Usar `src/components/ui/AppImage.vue` (`width`/`height` obligatorios, `loading="lazy"` salvo `eager`). Assets propios en WebP/AVIF.
