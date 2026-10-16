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

## Valores por entorno

| Entorno              | Valor                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| `.env` (desarrollo)  | Apagados (por defecto); descomenta o usa el panel de flags.                            |
| `.env.beta`          | Los 12 activados (más `VITE_PREVIEW=true`).                                            |
| `.env.production`    | Los 12 **activados**.                                                                  |
| Tests e2e            | `dist/` con los 12 activados y `dist-flags-off/` con todos apagados (`pnpm build:e2e`). |

Solo el literal `true` activa un flag; ausente o cualquier otro valor es «apagado».

## Comportamiento

- Con un flag apagado se ocultan **rutas (404), enlaces de navegación, bloques de Inicio y las peticiones de datos** asociadas; el código de cada estadística es un chunk perezoso.
- **Panel de flags** (`src/flags/FlagPanel.vue`): se monta en `development`, en beta y en previews de PR (`VITE_PREVIEW=true`), nunca en producción. Permite activar/desactivar un flag por navegador (se guarda en `localStorage`, clave `prognosports:flags`). En producción los overrides se ignoran.
- Añadir un flag: nueva entrada en `FLAG_DEFS`, su `readonly VITE_FF_…` en `src/env.d.ts`, la variable (en `true`) en `.env.beta` y `.env.production`, y el contenido cargado de forma perezosa. `scripts/build-e2e.ts` lee `FLAG_DEFS`, así que los e2e lo incluyen solos.
