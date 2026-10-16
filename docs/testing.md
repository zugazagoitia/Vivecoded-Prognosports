# Pruebas

Tres niveles, de más rápido a más lento. Antes de dar algo por terminado: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y los e2e que toquen el cambio.

| Nivel                      | Comando                                | Entra en CI | Cuándo usarlo                                      |
| -------------------------- | -------------------------------------- | :---------: | -------------------------------------------------- |
| Unitarias y de componentes | `pnpm test` (`test:watch`, `test:coverage`) | Sí (`test`) | Lógica, composables, stores, componentes.          |
| E2E y visuales             | `pnpm e2e` · `pnpm e2e:fast`           | Sí (`e2e`)  | Flujos de usuario, accesibilidad, capturas.        |
| Contrato                   | `pnpm test:contract` · `pnpm api:drift` | No          | Comprobar que la API real sigue igual (ver [`contract-tests.md`](contract-tests.md)). |

## 1. Unitarias y de componentes (Vitest)

- Los tests viven **junto al código** como `*.test.ts` (y `scripts/**/*.test.ts`). Entorno jsdom; `VITE_API_BASE_URL=http://api.test` y `VITE_API_MOCK=false` los fija `vite.config.ts`.
- `src/test/setup.ts` levanta el servidor MSW (`src/mocks/server.ts`) con `onUnhandledFrame: 'error'`: una petición sin handler **rompe el test**. Los handlers por área están en `src/mocks/handlers/`.
- Para montar componentes usa `renderWithProviders` de `src/test/render.ts` (Pinia, TanStack Query sin reintentos, i18n y router en memoria). Ejemplos en `src/test/examples.test.ts`. Consultas centradas en el usuario (`getByRole`, `findByText`…) con Testing Library; `freezeTime()` para fechas.
- **Fixtures con la forma REAL de la API** (`src/mocks/fixtures/`), no la de la spec: si el mock refleja la spec, los tests no detectan los fallos reales (así se coló `verified_at` frente a `verified`, #95). Cada fixture se valida contra su esquema Zod al importarse (`defineFixture`). Las discrepancias conocidas están en [`src/api/README.md`](../src/api/README.md) («Contraste de mocks con la API real»).
- Para tests de un error de API, sobrescribe el handler con `server.use(http.get(...))` devolviendo `ok(...)` / el sobre de error de `src/mocks/envelope.ts`; los errores de negocio reales llegan como HTTP 200 con `success:false`.
- Textos: las aserciones usan las cadenas de `src/i18n/es/` (no copies literales que luego cambian).
- **Cobertura** (`pnpm test:coverage`, reporters `text`, `html`, `lcov`, `cobertura`, `json-summary` en `coverage/`): el umbral (líneas/sentencias/funciones 90 %, ramas 85 %) se aplica solo a la lógica de dominio (`src/domain`, `src/utils`, `src/i18n`, `src/env.ts` y el núcleo de `src/api`: `client`, `errors`, `events`, `config`). En CI, el job `coverage` la sube a GitHub Code Quality y comenta el delta en el PR ([`ci.md`](ci.md#cobertura)); no bloquea.

## 2. E2E (Playwright)

- Se prueba el `dist/` **construido** con `vite preview` (nunca el servidor de desarrollo). `pnpm build:e2e` genera tres builds: `dist/` (producción con los 12 flags activados), `dist-flags-off/` (todos apagados, proyecto `flags-off`) y `dist-panel/` (modo beta con el panel de flags). `pnpm e2e` lo hace todo (typecheck + build + tests).
- La API está **siempre mockeada** con `page.route` (`e2e/support/api.ts`), con las mismas fixtures que MSW. Nunca se llama a la API real.
- Proyectos: `chromium`, `firefox`, `webkit`, `mobile` (motor Chromium) y `flags-off` (specs `*.flags-off.spec.ts`). Zona horaria `Europe/Madrid`, locale `es-ES`.
- **Accesibilidad:** todo componente o pantalla nueva debe pasar axe con `expectNoSeriousA11yViolations(page)` (`e2e/support/fixtures.ts`) en tema claro y oscuro.
- **Capturas (`toHaveScreenshot`):**
  - Solo de **Chromium** (proyectos `chromium` y `mobile`). En specs que corren en todos los navegadores, sal antes si `browserName !== 'chromium'`.
  - Solo en tema claro (`if (scheme === 'light')`), más oscuro en una pantalla clave por área. Una referencia por estado; no añadas capturas oscuras sin motivo. axe y overflow sí se comprueban en ambos temas.
  - Las referencias (`e2e/__screenshots__/<proyecto>/…`) **deben generarse en Linux**, como CI: `pnpm e2e:update:linux` (Docker con `mcr.microsoft.com/playwright:v1.64.0-noble`; la versión de la imagen debe coincidir con `@playwright/test`; en macOS con OrbStack, `orbctl start` si el demonio no está activo). **Nunca subas referencias generadas en macOS.**
  - Tras un merge con conflictos en `__screenshots__`, toma cualquiera de las versiones y **regenera todas** en Linux; no resuelvas PNG a mano.
- **Como CI:** `CI=1 pnpm exec playwright test --workers=2` (2 workers, 1 reintento en el workflow). Bajo carga pueden fallar tests de Firefox/WebKit que pasan en solitario: revisa antes de dar un fallo por real.
- En CI los e2e son la matriz completa del workflow `e2e.yml` (Chromium ×2 shards, mobile, flags-off, Firefox y WebKit), parte de `ci-ok`; tardan ~13 min de reloj. En PR corta tras 20 fallos (`--max-failures=20`); en push se ejecuta todo. Los informes se suben como artefactos `playwright-report-<proyecto>`.
- `e2e/security.spec.ts` inyecta la CSP de `dist/_headers` y falla ante cualquier `securitypolicyviolation` (ver [`security.md`](security.md)).
- Depuración: `pnpm e2e:ui`; la traza se conserva en fallos (`retain-on-failure`; en CI `on-first-retry`).

## 3. Contrato contra la API real

Ver [`contract-tests.md`](contract-tests.md). Solo lecturas; no forma parte de CI ni de `pnpm test`.

## 4. Lo que comprueban los hooks y CI además de los tests

`pre-commit` (oxlint, ESLint, Prettier sobre ficheros staged) y `pre-push` (`pnpm typecheck`); en CI, `lint`, `typecheck`, `audit`, `build`, `size` (presupuesto de bundle) y `ci-ok`. Tras cambiar de rama o hacer merge ejecuta `pnpm install --frozen-lockfile`: un `node_modules` desactualizado produce errores de tipos falsos.
