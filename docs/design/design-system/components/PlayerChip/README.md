# PlayerChip

Toggle that highlights a player in the charts of a view; its dot shows the colour that player gets.

## Props
| prop | values | default |
| --- | --- | --- |
| `player` | user | — |
| `pressed` | boolean | `false` |
| `color` | a `series-*` token | `series-rest` |

## Usage
- A row of chips goes under the chart, labelled «Resaltar». You are always on and cannot be turned off.
- At most five others; adding a sixth drops the oldest. Colours come from `series-2` … `series-6` in order of choice and stay with the player.
- Presets beside the chart (`Top 5`, `Mi entorno`, `Todos`) set the chips in one go.
- Source: redesign canvas (Gap, Bump, Fundamentos).
