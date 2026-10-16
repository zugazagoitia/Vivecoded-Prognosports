# CI, seguridad de workflows y promoción a master

Complementa [`deploy.md`](deploy.md) (despliegue), [`security.md`](security.md) (cabeceras/CSP) y [`testing.md`](testing.md) (pruebas). Resumen de convenciones de `.github/`.

## Visión general

| Workflow                   | Cuándo corre                                              | Qué hace                                                                                     |
| -------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ci.yml`                   | Cada PR y cada push a `develop`/`master`                  | Jobs `changes`, `lint`, `typecheck`, `test`, `coverage`, `audit`, `build (beta\|production)`, `size`, `e2e` y `ci-ok`. |
| `e2e.yml`                  | Llamado desde `ci.yml` (`workflow_call`), no tiene triggers | `e2e build` + matriz completa de Playwright. Parte de `ci-ok`.                              |
| `codeql.yml`               | PR, push a `develop`/`master`, lunes y a mano             | Escaneo de seguridad (CodeQL).                                                                |
| `deploy.yml`               | `workflow_run`: al terminar CI con éxito                  | Preview de PR, beta (`develop`) y producción (`master`, con aprobación).                      |
| `deploy-preview-cleanup.yml` | Al cerrar una PR                                        | Borra el Worker de preview.                                                                   |
| `promote-to-master.yml`    | Push a `develop` y a mano                                 | Mantiene la PR «Develop» (`develop -> master`).                                               |

**`ci-ok`** es el **único check obligatorio** (también en `master`): falla si cualquier job de su `needs` (`lint`, `typecheck`, `test`, `audit`, `build`, `size`, `e2e`) falla, se cancela o se omite. `coverage` queda fuera a propósito. No existe un `e2e-ok` aparte.

**Tiempos:** los e2e son lo más lento (~13 min de reloj; WebKit el que más). Como `deploy.yml` arranca cuando CI termina, **el despliegue de beta, de previews y de producción espera también a los e2e**.

## Si CI falla

Reproduce en local con las mismas condiciones antes de tocar nada (`pnpm install --frozen-lockfile`, `CI=1 pnpm exec playwright test --workers=2` para e2e) y distingue si el fallo lo causa tu rama o ya existía en `develop`. Las capturas fallan casi siempre por haberse generado fuera de Linux: ver [`testing.md`](testing.md#2-e2e-playwright).

Variables de CI sin definir llegan como cadena vacía (`VITE_SENTRY_DSN: ${{ vars.X }}` → `""`): el esquema de `src/env.ts` trata `""` como «no definido» en las variables opcionales; mantén esa norma al añadir variables. Los jobs que no instalan dependencias no deben usar `cache: pnpm` (lo resuelve `install: 'false'` en la acción compuesta).

## Reglas de los workflows

- `permissions: {}` a nivel de workflow; cada job declara solo lo que necesita (`contents: read` casi siempre).
- Todas las acciones de terceros fijadas por SHA con el comentario de versión. Dependabot (`github-actions`) las actualiza, incluida la acción local.
- `actions/checkout` siempre con `persist-credentials: false`.
- Todos los jobs tienen `timeout-minutes`; los workflows tienen `concurrency`.
- Nada de `${{ ... }}` con datos no confiables (títulos de PR, ramas, mensajes) dentro de `run:`: se pasan por `env:`.
- Los secretos (`CLOUDFLARE_*`) solo existen en los jobs de deploy y en el paso de wrangler; `SENTRY_AUTH_TOKEN` solo en el paso `vite build` de CI (vacío en forks).
- `deploy-preview-cleanup.yml` usa `pull_request_target` (necesario para secretos al cerrar una PR) pero solo hace checkout de la rama base y nunca ejecuta código de la PR.
- **Acción compuesta** `.github/actions/setup`: pnpm + Node (`.nvmrc`) + `pnpm install --frozen-lockfile` (opciones `install: 'false'` y `ignore-scripts: 'true'`). Se llama tras `actions/checkout`. Con `install: 'false'` no se activa `cache: pnpm` (ver AGENTS.md).
- `ci.yml` no usa `paths-ignore`: `ci-ok` es el check obligatorio y un workflow omitido por rutas lo deja «pendiente» para siempre. En su lugar, el job `changes` detecta los PR/push que **no tocan código**: solo `docs/**`, `.github/**` (workflows y acciones), `.vscode/**`, `.editorconfig`, `.gitignore`, `LICENSE*` o `*.md`. En ese caso se omiten `lint`, `typecheck`, `test`, `coverage`, `audit`, `size` y `e2e` (sigue `build`, necesario para el despliegue, y `ci-ok`, que acepta los jobs omitidos y pasa en verde). Cualquier otro fichero (incluidos `.env*`, `package.json`, `src/**`, `public/**`) ejecuta CI completo. Consecuencia: un cambio solo de workflows no se prueba en su propia PR; revísalo con cuidado.
- `codeql.yml` sí usa `paths-ignore` con las mismas rutas (no es un check obligatorio, así que no bloquea). Mantén ambas listas sincronizadas.

## E2E dentro de CI

`e2e.yml` es un workflow reutilizable (`workflow_call`) que `ci.yml` invoca en el job `e2e`; `ci-ok` depende de él. Un único check obligatorio (`ci-ok`) cubre lint, tipos, tests, auditoría, build, tamaño y e2e, en PR a `develop` y a `master` y en cada push. La matriz es siempre completa (chromium x2 shards, mobile, flags-off, firefox, webkit; sin cron ni `e2e-ok`). Reintentos: 1; en PR `--max-failures=20`. El concurrency lo define CI (un push nuevo cancela el run entero, e2e incluido).

## CodeQL

`codeql.yml` (configuración avanzada manual): consultas `security-extended`, `build-mode: none`, ignora `dist*`, `coverage`, informes y `e2e/__screenshots__`; corre en PR, push a `develop`/`master`, semanalmente (lunes) y a mano. Si activas además el «default setup» en Settings > Code security, desactívalo: chocan.

## Dependabot

`.github/dependabot.yml`: npm y github-actions, semanal, hacia `develop`, etiqueta `dependencies`, commits `Bump ...`, `cooldown` de 7 días (14 para mayores) y **sin auto-merge**. No hay Dockerfile, así que no hay ecosistema docker. Se ignoran las subidas mayores de `vue`, `vite` y `typescript` (se hacen a mano).

**Playwright** va en su propio grupo y fuera del grupo `minor-and-patch`: su versión debe coincidir con la imagen `mcr.microsoft.com/playwright:vX.Y.Z-noble` de `scripts/e2e-update-linux.sh`. Al fusionar su PR: actualizar `IMAGE` en el script, ejecutar `pnpm e2e:update:linux` y subir las capturas regeneradas (nunca desde macOS).

## Ramas y promoción develop -> master

Las ramas de feature salen de `develop` y se fusionan a `develop` por **squash**; `develop` pasa a `master` con la PR automática de abajo, por **merge commit**. `develop` despliega la beta y `master` la producción (previa aprobación en el entorno `production`). Flujo y reglas de actualización de ramas: [`AGENTS.md`](../AGENTS.md#cómo-trabajamos).

`promote-to-master.yml` mantiene **una** PR abierta `develop -> master` titulada «Develop»:

- Corre en cada push a `develop` y a mano (`workflow_dispatch`). Si `develop` no tiene commits respecto a `master`, no hace nada. Si la PR existe, solo actualiza título y cuerpo (lista de cambios agrupada: épicas, correcciones, otros). Solo usa `gh`; sin auto-merge.
- **Fusionar siempre con «Create a merge commit», nunca squash**: así `develop` y `master` comparten historia y la siguiente PR no arrastra todo otra vez.
- Requisito de repositorio: Settings > Actions > General > Workflow permissions > **«Allow GitHub Actions to create and approve pull requests»** (ya está activado).
- Limitación: las PR creadas con `GITHUB_TOKEN` **no disparan workflows** `pull_request`. Aun así `ci-ok` aparece en la PR (y por tanto los e2e): CI también corre en `push` a `develop` y los checks se asocian al SHA, que es el head de la PR `develop -> master`. No hace falta PAT. Si se quiere un run con evento `pull_request`, cerrar y reabrir la PR a mano.

## Cobertura

El job `test` genera `coverage/` (reporters `text`, `html`, `lcov`, `cobertura`, `json-summary`) y lo sube como artefacto. El job `coverage` (depende de `test`, **no** está en `needs` de `ci-ok`, así que nunca bloquea) hace dos cosas, ambas con `continue-on-error`:

- **Subida nativa** a GitHub Code Quality con `actions/upload-code-coverage` (Cobertura XML, `language: TypeScript`, etiqueta `code-coverage/vitest`). Requiere permiso `code-quality: write` (solo en ese job) y **Code Quality activado** en el repo (Settings > Code security). Si no está disponible, la acción avisa en el log y el job sigue en verde. La base de comparación de GitHub es la rama por defecto (`master`), por lo que los pushes a `master` fijan la línea base; los de `develop` también se suben.
- **Respaldo**: `scripts/coverage-report.sh` escribe los totales y el desglose por carpeta en el resumen del job y mantiene **un** comentario en la PR (marcador `<!-- coverage-report -->`, solo `gh`), con el delta frente al último CI correcto de la rama base (artefacto `coverage`, retención 7 días). Si el comentario nativo de GitHub aparece y resulta redundante, basta con borrar el paso «Informe de cobertura».

No se salta en forks ni en Dependabot (el token es de solo lectura): el job entero se omite. **No se ha creado ninguna regla de ruleset.** Para exigir cobertura más adelante: Settings > Rules > Rulesets > añadir la regla «Restrict code coverage» (mínimo de líneas o caída máxima por PR), o por REST (ver el changelog de GitHub del 2026-09-18). Requiere Code Quality y plan Team/Enterprise Cloud.
