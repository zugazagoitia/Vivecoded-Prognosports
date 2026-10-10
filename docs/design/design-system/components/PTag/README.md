# PTag

Small label for status and metadata in seven colours, three sizes and a pill variant.

Source: `src/components/lib/PTag.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## Props
| prop | values | default |
| --- | --- | --- |
| `color` | `primary` `success` `error` `warning` `info` `pink` `neutral` | `neutral` |
| `size` | `small` `medium` `large` | `medium` |
| `variant` | `default` (4px radius) `rounded` (pill) | `default` |

Content is the default slot. The colour list is exported as `TAG_COLORS` from `src/types/components.ts`.

## Notes
- Naming differs from PButton: the red tag is `error`, the red button is `danger`.
- In dark mode the status tags flip to the 400 fill with 900 text, which passes; in light mode white on the 500 fills is flagged (warning 1.9:1, success 2.3:1). Always put a word in the tag; never colour alone.
