# HitCell

Solid cell that shows how close a predicted driver was: exact, one position off, two off, or a miss with no colour.

## Props
| prop | values | default |
| --- | --- | --- |
| `kind` | `exact` `near` `far` `miss` `hidden` | `miss` |
| `label` | driver code or points | — |

## Usage
- Fills: `hit-exact`, `hit-near`, `hit-far` with their `-fg` text tokens. `miss` is transparent with muted text so the eye lands on the hits.
- `hidden` (`•••` on `surface-muted`) is for other players' predictions while the session is still open.
- Always put the code or the points inside; the colour is never the only signal. Pair a table of cells with a one-line legend.
- Source: redesign canvas (Resultados, ParrillaComunidad, Simulador). Not yet a Vue component.
