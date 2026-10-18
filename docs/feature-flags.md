# Feature flags

Doce estadísticas opcionales del ranking se controlan con variables `VITE_FF_<NOMBRE>`. Definición tipada en `src/flags/index.ts` (`FLAG_DEFS`); requisitos en [`requisitos.md`](requisitos.md) §18.

| Variable                          | Funcionalidad                      |
| --------------------------------- | ---------------------------------- |
| `VITE_FF_MY_SEASON`               | Mi temporada                       |
| `VITE_FF_HONOURS`                 | Palmarés                           |
| `VITE_FF_GAP`                     | Diferencia de puntos (Gap)         |
| `VITE_FF_BUMP`                    | Posición en la general (Bump)      |
| `VITE_FF_TITLE_RACE`              | Lucha por el título                |
| `VITE_FF_CONSISTENCY`             | Regularidad                        |
| `VITE_FF_HEAD_TO_HEAD`            | Cara a cara                        |
| `VITE_FF_DISTRIBUTION`            | Distribución de puntos             |
| `VITE_FF_HEATMAP`                 | Mapa de calor por GP               |
| `VITE_FF_HITS_BY_TYPE`            | Aciertos por tipo                  |
| `VITE_FF_POINTS_BY_SESSION`       | Puntos por sesión                  |
| `VITE_FF_COMMUNITY_PERCENTILE`    | Percentil entre comunidades        |
| `VITE_FF_PUBLIC_HEADSHOTS`        | Fotos de pilotos (pantalla G3)     |
| `VITE_FF_F1_TRACK_ICONS`          | Trazados de circuito de F1 (en lugar del SVG abierto) |
| `VITE_FF_F1_TEAM_LOGOS`           | Logos de equipo de F1 (en lugar de insignias propias) |

Los 12 primeros son estadísticas del ranking. `VITE_FF_F1_TRACK_ICONS` y `VITE_FF_F1_TEAM_LOGOS` (issue #223) son medios de F1 (`media.formula1.com`) con fallback propio: trazados abiertos y insignias de equipo si el flag está apagado o la imagen falla. Las URL por temporada están en `src/lib/f1Media/seasonAssets.ts`. `VITE_FF_PUBLIC_HEADSHOTS` (issue #206, idea 5) es distinto: muestra fotos de `media.formula1.com` (campo `headshot_url` de OpenF1) en el contexto de forma de la pantalla de pronóstico, con el avatar de iniciales como alternativa si el flag está apagado o la imagen falla.

> **Decisión del propietario (derechos de imagen):** las fotos son de Formula One, pero el proyecto no es comercial y el propietario considera las imágenes utilizables, por lo que el flag está **activado** en `.env.beta` y `.env.production` y apagado en `.env` (`VITE_FF_PUBLIC_HEADSHOTS`). Si la imagen falla se mantiene el avatar de iniciales. Detalle y CSP en [`security.md`](security.md).

## Valores por entorno

| Entorno              | Valor                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| `.env` (desarrollo)  | Apagados (por defecto); descomenta o usa el panel de flags.                            |
| `.env.beta`          | Los 12 de estadísticas activados (más `VITE_PREVIEW=true`); `PUBLIC_HEADSHOTS` y `F1_TRACK_ICONS`/`F1_TEAM_LOGOS` también activados. |
| `.env.production`    | Los 12 de estadísticas **activados**; `PUBLIC_HEADSHOTS` **activado** (decisión del propietario). `F1_TRACK_ICONS` y `F1_TEAM_LOGOS` **apagados a propósito**: el propietario quiere revisarlos primero en beta (issue #223); activarlos en producción es un cambio aparte. |
| Tests e2e            | `dist/` con todos activados (incluidos `PUBLIC_HEADSHOTS` y los de medios F1) y `dist-flags-off/` con todos apagados (`pnpm build:e2e`). |

Solo el literal `true` activa un flag; ausente o cualquier otro valor es «apagado».

## Comportamiento

- Con un flag apagado se ocultan **rutas (404), enlaces de navegación, bloques de Inicio y las peticiones de datos** asociadas; el código de cada estadística es un chunk perezoso.
- **Panel de flags** (`src/flags/FlagPanel.vue`): se monta en `development`, en beta y en previews de PR (`VITE_PREVIEW=true`), nunca en producción. Permite activar/desactivar un flag por navegador (se guarda en `localStorage`, clave `prognosports:flags`). En producción los overrides se ignoran.
- Añadir un flag: nueva entrada en `FLAG_DEFS`, su `readonly VITE_FF_…` en `src/env.d.ts`, la variable (en `true`) en `.env.beta` y `.env.production`, y el contenido cargado de forma perezosa. `scripts/build-e2e.ts` lee `FLAG_DEFS`, así que los e2e lo incluyen solos.
