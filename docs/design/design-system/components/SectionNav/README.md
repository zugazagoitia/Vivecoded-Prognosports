# SectionNav

Header for an area with many views: context selectors, section tabs and, under them, chips for the views of the active section.

## Props
| prop | values | default |
| --- | --- | --- |
| `sections` | `{label, views: [{label, to, flag?}]}` | — |
| `active` | view id | first |

## Usage
- Used by the ranking: Resumen, Clasificación, Por GP, Evolución, Aciertos, Comparar, Palmarés. The navbar's Ranking link opens Resumen.
- The community and season selectors stay in the header; changing one keeps the open view. Each view has its own URL.
- A view behind a disabled feature flag disappears; a section left with no views disappears too.
- On mobile it becomes a segmented control with the three main views plus «Ver todas las vistas». Source: redesign canvas (RankNav).
