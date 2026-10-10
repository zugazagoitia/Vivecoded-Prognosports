# PredictionSlot

One position of a prediction: filled with a driver (draggable), selected (waiting for a driver) or empty.

## Props
| prop | values | default |
| --- | --- | --- |
| `position` | 1..N | — |
| `driver` | driver object or `null` | `null` |
| `selected` | boolean | `false` |

## Usage
- Desktop: drag drivers from the pool onto slots or between slots. Every interaction also works without dragging: press an empty slot to select it (`brand-500` 2px border on `brand-100`), then pick a driver; arrows reorder; on mobile the picker opens in a `BottomSheet`.
- The team colour is a 4px bar, never the text colour.
- Show progress under the list (`N de M pilotos`) and let people copy a prediction from another session.
- Source: redesign canvas (Pronosticar, PronosticarMovil).
