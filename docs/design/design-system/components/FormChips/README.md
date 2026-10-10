# FormChips

The player's place in each of the last five Grands Prix, plus the movement in the standings since the last one.

## Props
| prop | values | default |
| --- | --- | --- |
| `places` | array of 5 numbers | — |
| `move` | integer (positive = up) | `0` |

## Usage
- Chip: `primary` fill with `on-primary` text = won the GP; `brand-100` tint = podium; `surface-muted` otherwise. Each chip has a title such as «GP de Italia: 3.º».
- Movement is text: `▲2` in `success-700`, `▼1` in `error-700` (300 steps in dark), `—` muted. Never colour alone.
- Used in standings tables, the mobile ranking and community home. Source: redesign canvas.
