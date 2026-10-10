# PCard

The surface every block of content sits on: optional header, padded body, optional footer of actions.

Source: `src/components/lib/PCard.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
Content in the default slot; optionally `title` (or a `header` slot) and a `footer` slot filled with `PCardFooterItem`s.

## Props
| prop | values | default |
| --- | --- | --- |
| `tag` | `article` `div` `section` `router-link` | `article` |
| `title` | string | none |
| `padding` | `none` `sm` (12px) `md` (12px, 20px from `sm` up) | `md` |
| `headerStyle`, `headerClass` | inline style or class for the header, e.g. a team colour | none |

## Notes
- Elevation is `shadow-card` plus a 1px ring (`black/5`, `white/10` in dark). Radius `rounded-lg`. Do not add borders or nest cards.
- `PCardFooterItem` takes `to` and splits the footer in equal columns of `brand-700` links.
