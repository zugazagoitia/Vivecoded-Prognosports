# BottomSheet

Mobile panel that slides up from the bottom for a short choice, such as picking a driver for a slot.

## Props
| prop | values | default |
| --- | --- | --- |
| `open` | boolean | `false` |
| `title` | string | — |

## Usage
- Scrim `gray-900` at 45%; pressing it, the handle or Escape closes. Top corners 16px; a 40×4px handle.
- Targets at least 44px. Focus moves into the sheet on open and back to the slot on close.
- Desktop uses a popover or the side pool instead. Source: redesign canvas (PronosticarMovil).
