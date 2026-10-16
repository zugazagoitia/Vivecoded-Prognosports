# CI, seguridad de workflows y promoción a master

Complementa `docs/deploy.md` (despliegue) y `docs/security.md` (cabeceras/CSP). Resumen de convenciones de `.github/`.

## Reglas de los workflows

- `permissions: {}` a nivel de workflow; cada job declara solo lo que necesita (`contents: read` casi siempre).
- Todas las acciones de terceros fijadas por SHA con el comentario de versión. Dependabot (`github-actions`) las actualiza, incluida la acción local.
- `actions/checkout` siempre con `persist-credentials: false`.
- Todos los jobs tienen `timeout-minutes`; los workflows tienen `concurrency`.
- Nada de `${{ ... }}` con datos no confiables (títulos de PR, ramas, mensajes) dentro de `run:`: se pasan por `env:`.
- Los secretos (`CLOUDFLARE_*`) solo existen en los jobs de deploy y en el paso de wrangler; `SENTRY_AUTH_TOKEN` solo en el paso `vite build` de CI (vacío en forks).
- `deploy-preview-cleanup.yml` usa `pull_request_target` (necesario para secretos al cerrar una PR) pero solo hace checkout de la rama base y nunca ejecuta código de la PR.
- **Acción compuesta** `.github/actions/setup`: pnpm + Node (`.nvmrc`) + `pnpm install --frozen-lockfile` (opciones `install: 'false'` y `ignore-scripts: 'true'`). Se llama tras `actions/checkout`. Con `install: 'false'` no se activa `cache: pnpm` (ver AGENTS.md).
- No se usa `paths-ignore` en CI ni e2e: `ci-ok` es el check obligatorio y un workflow omitido por rutas deja el check «pendiente» para siempre. Si hace falta ahorrar minutos en cambios de solo documentación, hay que hacerlo dentro de los jobs, manteniendo `ci-ok`.

## E2E dentro de CI

`e2e.yml` es un workflow reutilizable (`workflow_call`) que `ci.yml` invoca en el job `e2e`; `ci-ok` depende de él. Un único check obligatorio (`ci-ok`) cubre lint, tipos, tests, auditoría, build, tamaño y e2e, en PR a `develop` y a `master` y en cada push. La matriz es siempre completa (chromium x2 shards, mobile, flags-off, firefox, webkit; sin cron ni `e2e-ok`). Reintentos: 1; en PR `--max-failures=20`. El concurrency lo define CI (un push nuevo cancela el run entero, e2e incluido).

## CodeQL

`codeql.yml` (configuración avanzada manual): consultas `security-extended`, `build-mode: none`, ignora `dist*`, `coverage`, informes y `e2e/__screenshots__`; corre en PR, push a `develop`/`master`, semanalmente (lunes) y a mano. Si activas además el «default setup» en Settings > Code security, desactívalo: chocan.

## Dependabot

`.github/dependabot.yml`: npm y github-actions, semanal, hacia `develop`, etiqueta `dependencies`, commits `Bump ...`, `cooldown` de 7 días (14 para mayores) y **sin auto-merge**. No hay Dockerfile, así que no hay ecosistema docker. Se ignoran las subidas mayores de `vue`, `vite` y `typescript` (se hacen a mano).

**Playwright** va en su propio grupo y fuera del grupo `minor-and-patch`: su versión debe coincidir con la imagen `mcr.microsoft.com/playwright:vX.Y.Z-noble` de `scripts/e2e-update-linux.sh`. Al fusionar su PR: actualizar `IMAGE` en el script, ejecutar `pnpm e2e:update:linux` y subir las capturas regeneradas (nunca desde macOS).

## Promoción develop -> master

`promote-to-master.yml` mantiene **una** PR abierta `develop -> master` titulada «Develop»:

- Corre en cada push a `develop` y a mano (`workflow_dispatch`). Si `develop` no tiene commits respecto a `master`, no hace nada. Si la PR existe, solo actualiza título y cuerpo (lista de cambios agrupada: épicas, correcciones, otros). Solo usa `gh`; sin auto-merge.
- **Fusionar siempre con «Create a merge commit», nunca squash**: así `develop` y `master` comparten historia y la siguiente PR no arrastra todo otra vez.
- Requisito de repositorio: Settings > Actions > General > Workflow permissions > **«Allow GitHub Actions to create and approve pull requests»** (a fecha de este PR está activado).
- Limitación: las PR creadas con `GITHUB_TOKEN` **no disparan workflows** `pull_request`. Aun así `ci-ok` aparece en la PR (y por tanto los e2e): CI también corre en `push` a `develop` y los checks se asocian al SHA, que es el head de la PR `develop -> master`. No hace falta PAT. Si se quiere un run con evento `pull_request`, cerrar y reabrir la PR a mano.

## Cobertura

El job `test` genera `coverage/` (reporters `text`, `html`, `lcov`, `cobertura`, `json-summary`) y lo sube como artefacto. El job `coverage` (depende de `test`, **no** está en `needs` de `ci-ok`, así que nunca bloquea) hace dos cosas, ambas con `continue-on-error`:

- **Subida nativa** a GitHub Code Quality con `actions/upload-code-coverage` (Cobertura XML, `language: TypeScript`, etiqueta `code-coverage/vitest`). Requiere permiso `code-quality: write` (solo en ese job) y **Code Quality activado** en el repo (Settings > Code security). Si no está disponible, la acción avisa en el log y el job sigue en verde. La base de comparación de GitHub es la rama por defecto (`master`), por lo que los pushes a `master` fijan la línea base; los de `develop` también se suben.
- **Respaldo**: `scripts/coverage-report.sh` escribe los totales y el desglose por carpeta en el resumen del job y mantiene **un** comentario en la PR (marcador `<!-- coverage-report -->`, solo `gh`), con el delta frente al último CI correcto de la rama base (artefacto `coverage`, retención 7 días). Si el comentario nativo de GitHub aparece y resulta redundante, basta con borrar el paso «Informe de cobertura».

No se salta en forks ni en Dependabot (el token es de solo lectura): el job entero se omite. **No se ha creado ninguna regla de ruleset.** Para exigir cobertura más adelante: Settings > Rules > Rulesets > añadir la regla «Restrict code coverage» (mínimo de líneas o caída máxima por PR), o por REST (ver el changelog de GitHub del 2026-09-18). Requiere Code Quality y plan Team/Enterprise Cloud.
