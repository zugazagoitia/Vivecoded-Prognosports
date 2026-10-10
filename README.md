# PrognoSports (Vivecoded)

Rediseño del frontend de PrognoSports: Vue 3.5 (Composition API, `<script setup lang="ts">`), Vite, TypeScript estricto y pnpm. El backend y la API `v2` no cambian. Los requisitos están en `docs/requisitos.md` y las issues en `docs/design/issues/`.

## Requisitos

- Node.js LTS (ver `.nvmrc`; `engines` exige `>=22`).
- pnpm `10.34.6`, fijado en `packageManager` y `devEngines`. Con Corepack activo (`corepack enable`) se usa solo la versión correcta.

## Puesta en marcha

```sh
pnpm install --frozen-lockfile
pnpm dev                  # servidor de desarrollo (modo development)
pnpm build --mode beta    # build de beta, con banner
pnpm build                # build de producción
```

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo de Vite (modo `development`). |
| `pnpm dev --mode beta` | Desarrollo con el entorno beta. |
| `pnpm build` | Typecheck y build de producción en `dist/` (modo `production`). |
| `pnpm build --mode beta` | Typecheck y build de beta. |
| `pnpm preview` | Sirve `dist/` localmente. |
| `pnpm typecheck` | `vue-tsc --noEmit` sobre `tsconfig.app.json` y `tsconfig.node.json`. |

Lint, tests y CI llegan en T8, T9 y T11.

## Modos y variables de entorno

Modos de Vite: `development` (`.env`), `beta` (`.env.beta`) y `production` (`.env.production`). El banner «Estás utilizando PrognoSports Beta» solo se muestra en `beta`.

| Variable | Origen | Descripción |
|---|---|---|
| `VITE_API_BASE_URL` | `.env*` (obligatoria) | URL base de la API. También se usa para el `preconnect` de `index.html`. |
| `VITE_GIT_SHA` | `git` o entorno | SHA corto del build. CI puede pasarlo (T11). |
| `VITE_GIT_DATE` | `git` o entorno | Fecha ISO del commit del build. |
| `VITE_APP_VERSION` | `package.json` o entorno | Versión de la app (pie de página). |

Las variables se tipan en `src/env.d.ts` y se validan al arrancar con Zod en `src/env.ts`. Si falta alguna o es inválida, la app no arranca y muestra el error (nombrando la variable) en consola y en pantalla. Nunca pongas secretos en `VITE_*`: acaban en el bundle. Los `.env`, `.env.beta` y `.env.production` están versionados y solo contienen configuración pública; los overrides locales van en `.env.local` (ignorado).

## Estructura

```
src/
  api/                 cliente y capa de acceso a la API (T2)
  router/, pages/      rutas, layouts y páginas (T3)
  stores/, queries/    Pinia y TanStack Query (T4)
  i18n/                cadenas en español (T5)
  flags/               feature flags (T6)
  components/
    ui/                componentes base (F3)
    data/              tablas y datos (F4)
    charts/            gráficas (F5)
    layout/            navegación y estructura (N1-N4)
  styles/              tokens y estilos globales (F1-F2)
  composables/         composables compartidos
  utils/               utilidades
  env.ts, env.d.ts     entorno validado y tipado
  main.ts, App.vue     arranque
```

El alias `@/` apunta a `src/`. Las carpetas vacías llevan un `.keep` que cada issue puede borrar al añadir su contenido.

## Ramas

Modelo de ramas: `develop` (integración) y `master` (producción), según §21.10 de los requisitos.
