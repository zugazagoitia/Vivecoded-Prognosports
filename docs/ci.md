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
- No se usa `paths-ignore` en CI ni e2e: `ci-ok` y `e2e-ok` son checks obligatorios y un workflow omitido por rutas deja el check «pendiente» para siempre. Si hace falta ahorrar minutos en cambios de solo documentación, hay que hacerlo dentro de los jobs, manteniendo `ci-ok`.

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
- Limitación: las PR creadas con `GITHUB_TOKEN` **no disparan workflows** `pull_request`. El check `ci-ok` sí aparece (es el del último push a `develop`, mismo SHA), pero `e2e-ok` (solo en PR a `master`) no se ejecuta. Opciones: cerrar y reabrir la PR a mano (el evento lo genera un usuario y sí dispara los workflows), o crear un token de GitHub App / PAT de ámbito mínimo y usarlo en el workflow en lugar de `github.token` (decisión del propietario; no incluido).
