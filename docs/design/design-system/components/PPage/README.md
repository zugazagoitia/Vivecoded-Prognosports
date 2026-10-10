# PPage

The frame of every app view: breadcrumb, title, subtitle, actions, then the content in a card.

Source: `src/components/lib/PPage.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
The view's content in the default slot and, when the title is dynamic, `title` (otherwise the route's `meta.title` is used). Buttons go in the `actions` slot.

## Props
| prop | values | default |
| --- | --- | --- |
| `title`, `subtitle` | string | route title, none |
| `variant` | `card` (content inside one PCard) `plain` (the view lays out its own cards) | `card` |
| `size` | `sm` `md` `lg` `xl` `full` (PContainer widths) | `full` |
| `loading` | boolean: shows `Loading` instead of the content | `false` |
| `notFound` | boolean or message: shows a danger alert (`No se ha encontrado lo que buscabas`) | `false` |
| `breadcrumb` | boolean | `true` |

## Notes
- Blocks are stacked with a 16px gap. It owns the document title and the last breadcrumb, so use exactly one per view.
