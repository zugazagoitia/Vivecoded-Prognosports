# PTitle

Headings in four types; the tag and the look are chosen separately.

Source: `src/components/lib/PTitle.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## Props
| prop | values | default |
| --- | --- | --- |
| `type` | `title` (36px, 24px below `md`) `subtitle` (24/20px) `header` (20/18px) `section` (as subtitle, not selectable) | `title` |
| `tag` | `h1`-`h6`, `p` | `h1` |
| `align` | `left` `center` | `left` |
| `noMargin` | boolean: drops the `mb-3` | `false` |
| `name` | text, or the default slot | none |

## Notes
- Always weight 600, `text-heading`. One `type="title"` per page; `PPage` renders it for you.
