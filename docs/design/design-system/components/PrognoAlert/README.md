# PrognoAlert

Inline banner for page-level messages in four variants, with an outline icon and an optional close button.

Source: `src/components/lib/PrognoAlert.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## When to use
State that belongs to the page: not found, no permission, the beta notice. For the result of an action use a toast (`vue-sonner`, through `notificationService`).

## Props
| prop | values | default |
| --- | --- | --- |
| `variant` | `info` `warning` `danger` `success` | `info` |
| `message` | string, or the default slot | `""` |
| `icon` | boolean | `true` |
| `closable` | boolean; emits `afterClose` | `false` |

## Notes
- Each variant has its own outline icon, so status never rests on colour alone. Keep the icon on.
- Contrast flagged: `success` (success-500 on success-100, 2.1:1), `warning` (2.7:1) and `danger` (3.1:1) text miss 4.5:1; the bold weight does not make 14px large text. The tints do not change in dark mode, except `info`.
- `AlertInvalidData` and `AlertNoPermission` are thin wrappers around the `danger` variant.
