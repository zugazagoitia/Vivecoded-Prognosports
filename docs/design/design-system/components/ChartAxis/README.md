# ChartAxis

The x-axis of a GP chart as a row of buttons; pressing one pins a dashed guide and a fixed value panel at that Grand Prix.

## Props
| prop | values | default |
| --- | --- | --- |
| `gps` | array of `{code, name}` | — |
| `selected` | index | last completed GP |
| `values` | rows `{player, color, value}` for the panel | — |

## Usage
- Buttons are 32px minimum, `text-[11px]` muted; the pinned one uses the `brand-100` tint with `brand-600` bold text and `aria-pressed`.
- Align the button centres with the chart's x positions: the row spans the plot width plus one button.
- The panel (`shadow-lg`, 8px radius, `aria-live="polite"`) lists the highlighted players sorted by value, with the series dot and tabular numbers. On wide screens it sits beside the chart; on narrow ones, under it.
- Hover previews, click pins, Tab + Enter work. Source: redesign canvas (Gap, Bump, Graficos).
